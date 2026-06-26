import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import * as XLSX from "npm:xlsx@0.18.5";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { decodeBase64 } from "jsr:@std/encoding@1/base64";

// Winning Suppliers sync — receives an XLSX file as base64 in POST body, parses
// the official tender annex (נספח ד2 — מכרז דיגטק 07-2023), and atomically
// replaces all 4 tables (clusters, specializations, suppliers, qualifications).
//
// Not on pg_cron. Triggered manually when a new government tender concludes.
// Auth via cron_secret in Authorization header.
//
// Request body: { "xlsx_base64": "<base64 of .xlsx file>" }

// Cluster slugs (transliteration of the 7 fixed clusters)
const CLUSTER_SLUGS: Record<string, { slug: string; sort: number }> = {
  "תיכנון ניתוח ופיתוח":                    { slug: "planning-analysis-development", sort: 1 },
  "תשתיות והגירה לענן":                     { slug: "infra-cloud-migration",          sort: 2 },
  "חדשנות טכנולוגית":                       { slug: "tech-innovation",                sort: 3 },
  "אינטגרציה של פתרונות צד ג לענן":         { slug: "third-party-cloud-integration",  sort: 4 },
  "הדרכה":                                  { slug: "training",                       sort: 5 },
  "אבטחת מידע":                             { slug: "infosec",                        sort: 6 },
  "בסיסי נתונים":                           { slug: "databases",                      sort: 7 },
};

// Column indices in the data section (A=0, B=1, ...)
const COL = {
  supplier:        0,  // A — שם המציע
  manof:           1,  // B — מספר מנו"ף
  sigmaSupplier:   2,  // C — מספר ספק סיגמה
  sigmaAgreement:  3,  // D — מספר הסכם סיגמה
  validFrom:       4,  // E — תחילת תוקף
  validTo:         5,  // F — סיום תוקף
  agreementName:   6,  // G — שם הסכם
  cluster:         7,  // H — אשכול
  specialty:       8,  // I — התמחות
  size:            9,  // J — גודל
  sku:            10,  // K — מק"ט
  // Legend (off to the side, columns AK/AL — indices 36/37)
  legendName:     36,
  legendSku:      37,
};

interface ClusterPayload {
  name: string;
  slug: string;
  sort_order: number;
}
interface SpecPayload {
  cluster_name: string;
  name: string;
  name_normalized: string;
  catalog_number: string | null;
}
interface SupplierPayload {
  name: string;
  manof_number: string | null;
  sigma_supplier_no: string | null;
  sigma_agreement_no: string | null;
  agreement_name: string | null;
  valid_from: string | null;
  valid_to: string | null;
}
interface QualPayload {
  supplier_name: string;
  cluster_name: string;
  specialization_name: string;
  size: string | null;
  catalog_number: string | null;
  source_row: number;
}

// Normalize: TRIM + collapse internal multiple whitespace into single space
function norm(v: unknown): string {
  return String(v ?? "").replace(/\s+/g, " ").trim();
}

function asTextOrNull(v: unknown): string | null {
  const s = norm(v);
  return s === "" ? null : s;
}

function normSize(v: unknown): string | null {
  const s = norm(v);
  if (s === "גדול") return "גדול";
  if (s === "קטן")  return "קטן";
  return null;
}

// Excel serial date → ISO YYYY-MM-DD
function parseExcelDate(v: unknown): string | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") {
    const ms = Math.round((v - 25569) * 86400 * 1000);
    return new Date(ms).toISOString().slice(0, 10);
  }
  if (typeof v === "string") {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  }
  return null;
}

function findHeaderRow(rows: unknown[][]): number {
  for (let i = 0; i < Math.min(40, rows.length); i++) {
    const row = rows[i] || [];
    if (row[COL.supplier] === "שם המציע" || (typeof row[COL.supplier] === "string" && row[COL.supplier].includes("שם המציע"))) {
      return i;
    }
  }
  return -1;
}

interface ParseResult {
  clusters: ClusterPayload[];
  specializations: SpecPayload[];
  suppliers: SupplierPayload[];
  qualifications: QualPayload[];
}

function parseWorkbook(buf: Uint8Array): ParseResult {
  const wb = XLSX.read(buf, { type: "array" });
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  if (!sheet) throw new Error("Workbook has no sheets");

  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false, defval: "" }) as unknown[][];
  const headerIdx = findHeaderRow(rows);
  if (headerIdx < 0) throw new Error("Could not locate header row (expected column A = 'שם המציע')");

  // 1. Build legend map: specialty_name → SKU (from columns AK/AL)
  const legend = new Map<string, string>();
  for (const row of rows.slice(headerIdx + 1)) {
    const nm = norm(row[COL.legendName]);
    const sk = norm(row[COL.legendSku]);
    if (nm && sk && nm !== "שם התמחות = שם המק\"ט") {
      legend.set(nm, sk);
    }
  }

  // 2. Walk data rows, build all 4 collections
  const clustersMap = new Map<string, ClusterPayload>();
  const specsMap    = new Map<string, SpecPayload>();      // key: cluster||spec
  const suppliersMap = new Map<string, SupplierPayload>(); // key: supplier name
  const quals: QualPayload[] = [];

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i] || [];
    const supplierName = norm(row[COL.supplier]);
    if (!supplierName) continue;

    const clusterName  = norm(row[COL.cluster]);
    const specName     = norm(row[COL.specialty]);
    if (!clusterName || !specName) continue;

    // Cluster
    if (!clustersMap.has(clusterName)) {
      const meta = CLUSTER_SLUGS[clusterName];
      clustersMap.set(clusterName, {
        name: clusterName,
        slug: meta?.slug ?? `cluster-${clustersMap.size + 1}`,
        sort_order: meta?.sort ?? (clustersMap.size + 100),
      });
    }

    // Specialization (per cluster — same name can appear in multiple clusters,
    // e.g. "פתרונות תוכנה חדשניים" exists in both תיכנון and חדשנות)
    const specKey = `${clusterName}||${specName}`;
    if (!specsMap.has(specKey)) {
      specsMap.set(specKey, {
        cluster_name: clusterName,
        name: specName,
        name_normalized: specName,
        catalog_number: legend.get(specName) ?? null,
      });
    }

    // Supplier (deduplicated by name — 1:1 with agreement per the spec)
    if (!suppliersMap.has(supplierName)) {
      suppliersMap.set(supplierName, {
        name: supplierName,
        manof_number:        asTextOrNull(row[COL.manof]),
        sigma_supplier_no:   asTextOrNull(row[COL.sigmaSupplier]),
        sigma_agreement_no:  asTextOrNull(row[COL.sigmaAgreement]),
        agreement_name:      asTextOrNull(row[COL.agreementName]),
        valid_from:          parseExcelDate(row[COL.validFrom]),
        valid_to:            parseExcelDate(row[COL.validTo]),
      });
    }

    // Qualification row
    quals.push({
      supplier_name: supplierName,
      cluster_name: clusterName,
      specialization_name: specName,
      size: normSize(row[COL.size]),
      catalog_number: asTextOrNull(row[COL.sku]),
      source_row: i + 1, // 1-based for human reference
    });
  }

  return {
    clusters: Array.from(clustersMap.values()),
    specializations: Array.from(specsMap.values()),
    suppliers: Array.from(suppliersMap.values()),
    qualifications: quals,
  };
}

function dedupeQuals(quals: QualPayload[]): { unique: QualPayload[]; dropped: number } {
  const seen = new Set<string>();
  const unique: QualPayload[] = [];
  let dropped = 0;
  for (const q of quals) {
    const key = `${q.supplier_name}||${q.cluster_name}||${q.specialization_name}||${q.size ?? "_"}`;
    if (seen.has(key)) { dropped++; continue; }
    seen.add(key);
    unique.push(q);
  }
  return { unique, dropped };
}

function errMsg(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  try { return JSON.stringify(e); } catch { return String(e); }
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return jsonResponse(405, { ok: false, error: "POST required" });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  // Auth via cron_secret
  const secretRes = await supabase
    .from("app_secrets")
    .select("value")
    .eq("key", "cron_secret")
    .single();
  if (secretRes.error || !secretRes.data) {
    return jsonResponse(503, { ok: false, error: "cron_secret not set: " + errMsg(secretRes.error) });
  }
  const expected = `Bearer ${secretRes.data.value}`;
  const auth = req.headers.get("Authorization") ?? "";
  if (auth !== expected) return jsonResponse(401, { ok: false, error: "Unauthorized" });

  const start = Date.now();
  try {
    const body = await req.json() as { xlsx_base64?: string };
    if (!body.xlsx_base64) throw new Error("Missing xlsx_base64 in request body");

    const buf = decodeBase64(body.xlsx_base64);
    const parsed = parseWorkbook(buf);

    if (parsed.qualifications.length === 0) {
      throw new Error("Parsed 0 qualifications — refusing to wipe tables");
    }

    const { unique, dropped } = dedupeQuals(parsed.qualifications);

    const payload = {
      clusters: parsed.clusters,
      specializations: parsed.specializations,
      suppliers: parsed.suppliers,
      qualifications: unique,
    };

    const { data, error } = await supabase.rpc("suppliers_replace_all", { p_data: payload });
    if (error) throw error;

    return jsonResponse(200, {
      ok: true,
      parsed: {
        clusters: parsed.clusters.length,
        specializations: parsed.specializations.length,
        suppliers: parsed.suppliers.length,
        qualifications_raw: parsed.qualifications.length,
        qualifications_unique: unique.length,
        duplicates_dropped: dropped,
      },
      inserted: data,
      ms: Date.now() - start,
    });
  } catch (e) {
    return jsonResponse(500, { ok: false, error: errMsg(e), ms: Date.now() - start });
  }
});
