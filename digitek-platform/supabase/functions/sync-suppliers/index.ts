import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import * as XLSX from "npm:xlsx@0.18.5";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { decodeBase64 } from "jsr:@std/encoding@1/base64";

// Winning Suppliers sync — receives an XLSX file as base64 in POST body, parses
// the official tender annex, and atomically replaces that domain's rows
// (clusters, specializations, suppliers, qualifications).
//
// Two annexes of tender דיגטק 07-2023 (הודעה 16.2.19):
//   domain='tech'    — נספח ד2 "רשימת ספקים זוכים מעולמות הטק"   (first sheet)
//   domain='digital' — נספח ד1, sheet "טבלה מסכמת שמית" inside "ספקים דיגיטל .xlsx"
//
// Not on pg_cron. Triggered manually when a new government tender concludes.
// Auth via cron_secret in Authorization header.
//
// Request body: { "xlsx_base64": "<base64 of .xlsx file>", "domain": "tech" | "digital" }

type Domain = "tech" | "digital";

const CLUSTER_SLUGS: Record<Domain, Record<string, { slug: string; sort: number }>> = {
  tech: {
    "תיכנון ניתוח ופיתוח":                    { slug: "planning-analysis-development", sort: 1 },
    "תשתיות והגירה לענן":                     { slug: "infra-cloud-migration",          sort: 2 },
    "חדשנות טכנולוגית":                       { slug: "tech-innovation",                sort: 3 },
    "אינטגרציה של פתרונות צד ג לענן":         { slug: "third-party-cloud-integration",  sort: 4 },
    "הדרכה":                                  { slug: "training",                       sort: 5 },
    "אבטחת מידע":                             { slug: "infosec",                        sort: 6 },
    "בסיסי נתונים":                           { slug: "databases",                      sort: 7 },
  },
  digital: {
    "תוכן":            { slug: "content",            sort: 1 },
    "חווית משתמש":     { slug: "user-experience",    sort: 2 },
    "דאטה":            { slug: "data",               sort: 3 },
    "שינוי תהליכים":   { slug: "process-change",     sort: 4 },
    "ניהול מוצר":      { slug: "product-management", sort: 5 },
  },
};

// Column indices per annex (A=0, B=1, ...). The two annexes use different layouts.
const COLUMNS: Record<Domain, {
  supplier: number; manof: number; sigmaSupplier: number; sigmaAgreement: number;
  validFrom: number; validTo: number; agreementName: number;
  cluster: number; specialty: number; size: number; sku: number;
  legendName: number | null; legendSku: number | null;
}> = {
  // נספח ד2 — supplier, manof, sigma supplier, sigma agreement, dates, agreement, cluster, spec, size, sku
  tech: {
    supplier: 0, manof: 1, sigmaSupplier: 2, sigmaAgreement: 3,
    validFrom: 4, validTo: 5, agreementName: 6,
    cluster: 7, specialty: 8, size: 9, sku: 10,
    legendName: 36, legendSku: 37, // spec→SKU legend off to the side
  },
  // נספח ד1 — supplier, dates, linkage/guarantee/insurance (3-5, unused), manof,
  // sigma agreement, sigma supplier, agreement, cluster, spec, size, item name (13, unused), sku
  digital: {
    supplier: 0, manof: 6, sigmaSupplier: 8, sigmaAgreement: 7,
    validFrom: 1, validTo: 2, agreementName: 9,
    cluster: 10, specialty: 11, size: 12, sku: 14,
    legendName: null, legendSku: null, // SKU is inline per row
  },
};

// The digital annex lives in a workbook full of internal work sheets — only
// this sheet is the official winners list.
const DIGITAL_SHEET = "טבלה מסכמת שמית";

// Data inconsistency in annex D1: the same specialty appears in two spellings.
const SPEC_ALIASES: Record<string, string> = {
  "תרגום שפות אחרות": "תרגום לשפה אחרת",
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
  if (s === "ל.ר" || s === 'ל"ר' || s === "לר") return "ל.ר"; // annex D1 only
  return null;
}

// Excel serial date / ISO string / dd.mm.yyyy (annex D1 uses the latter) → ISO YYYY-MM-DD
function parseExcelDate(v: unknown): string | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") {
    const ms = Math.round((v - 25569) * 86400 * 1000);
    return new Date(ms).toISOString().slice(0, 10);
  }
  if (typeof v === "string") {
    const s = norm(v);
    const dmy = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  }
  return null;
}

function findHeaderRow(rows: unknown[][], supplierCol: number): number {
  for (let i = 0; i < Math.min(40, rows.length); i++) {
    const row = rows[i] || [];
    const cell = row[supplierCol];
    if (cell === "שם המציע" || (typeof cell === "string" && cell.includes("שם המציע"))) {
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

function parseWorkbook(buf: Uint8Array, domain: Domain): ParseResult {
  const wb = XLSX.read(buf, { type: "array" });
  const sheetName = domain === "digital"
    ? wb.SheetNames.find((n: string) => norm(n) === DIGITAL_SHEET)
    : wb.SheetNames[0];
  if (!sheetName) throw new Error(`Sheet "${DIGITAL_SHEET}" not found in workbook (sheets: ${wb.SheetNames.join(", ")})`);
  const sheet = wb.Sheets[sheetName];
  if (!sheet) throw new Error("Workbook has no sheets");

  const COL = COLUMNS[domain];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false, defval: "" }) as unknown[][];
  const headerIdx = findHeaderRow(rows, COL.supplier);
  if (headerIdx < 0) throw new Error("Could not locate header row (expected column A = 'שם המציע')");

  // 1. Legend map: specialty_name → SKU (annex D2 only; D1 carries the SKU inline)
  const legend = new Map<string, string>();
  if (COL.legendName !== null && COL.legendSku !== null) {
    for (const row of rows.slice(headerIdx + 1)) {
      const nm = norm(row[COL.legendName]);
      const sk = norm(row[COL.legendSku]);
      if (nm && sk && nm !== "שם התמחות = שם המק\"ט") {
        legend.set(nm, sk);
      }
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

    const clusterName = norm(row[COL.cluster]);
    let specName = norm(row[COL.specialty]);
    if (!clusterName || !specName) continue;
    specName = SPEC_ALIASES[specName] ?? specName;

    const rowSku = asTextOrNull(row[COL.sku]);

    // Cluster
    if (!clustersMap.has(clusterName)) {
      const meta = CLUSTER_SLUGS[domain][clusterName];
      clustersMap.set(clusterName, {
        name: clusterName,
        slug: meta?.slug ?? `${domain}-cluster-${clustersMap.size + 1}`,
        sort_order: meta?.sort ?? (clustersMap.size + 100),
      });
    }

    // Specialization (per cluster — same name can appear in multiple clusters).
    // catalog_number: from the legend (D2) or the first inline SKU seen (D1).
    const specKey = `${clusterName}||${specName}`;
    if (!specsMap.has(specKey)) {
      specsMap.set(specKey, {
        cluster_name: clusterName,
        name: specName,
        name_normalized: specName,
        catalog_number: legend.get(specName) ?? rowSku,
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
      catalog_number: rowSku,
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
    const body = await req.json() as { xlsx_base64?: string; domain?: string };
    if (!body.xlsx_base64) throw new Error("Missing xlsx_base64 in request body");
    const domain = (body.domain ?? "tech") as Domain;
    if (domain !== "tech" && domain !== "digital") throw new Error("domain must be tech or digital");

    const buf = decodeBase64(body.xlsx_base64);
    const parsed = parseWorkbook(buf, domain);

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

    const { data, error } = await supabase.rpc("suppliers_replace_all", { p_data: payload, p_domain: domain });
    if (error) throw error;

    return jsonResponse(200, {
      ok: true,
      domain,
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
