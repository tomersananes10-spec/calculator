import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import * as XLSX from "npm:xlsx@0.18.5";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Roved5 weekly sync — downloads the public Google Sheet, parses 2 tabs (GCP, AWS),
// dedupes by id (last-wins), and atomically replaces public.roved5_services.
//
// Triggered by pg_cron (Sunday 00:00 UTC) which calls this function via pg_net
// with `Authorization: Bearer <cron_secret>` read from public.app_secrets.
//
// Deployed via Supabase MCP `deploy_edge_function`. Source kept here for review/history.

const SHEET_ID = "1tVqGbXrEadyMOkvq1qL--85RiAVHF-uQ";
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=xlsx`;

const COL = {
  id: 1, provider: 2, manufacturer: 3, name: 4, description: 5,
  type: 6, discount: 7, priceLink: 8, contact: 9, approvalDate: 10,
  notes: 11, psServices: 12,
};

interface ServiceRow {
  id: string;
  cloud: "AWS" | "GCP";
  provider: string;
  manufacturer: string;
  name: string;
  description: string;
  type: "SaaS" | "non-SaaS";
  discount: number | null;
  price_link: string;
  contact: string;
  approval_date: string;
  notes: string;
  ps_services: string;
}

function findHeaderRow(rows: unknown[][]): number {
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const row = rows[i] || [];
    if (row.some((c) => typeof c === "string" && c.includes('מק"ט'))) return i;
  }
  return -1;
}

function parseDate(raw: unknown): string {
  if (raw === "" || raw === null || raw === undefined) return "";
  if (typeof raw === "number") {
    const str = raw.toString();
    const parts = str.split(".");
    if (parts.length === 2) return `${parts[0].padStart(2, "0")}/${parts[1]}`;
    return str;
  }
  return String(raw).trim();
}

function parsePsServices(raw: unknown): string {
  if (raw === true) return "כלול";
  if (raw === false) return "לא כלול";
  const s = String(raw ?? "").trim();
  if (!s) return "לא כלול";
  if (s === "TRUE" || s === "true" || s.includes("כן") || s === "כלול") return "כלול";
  if (s === "FALSE" || s === "false" || s.includes("לא")) return "לא כלול";
  return s;
}

function parseType(raw: unknown): "SaaS" | "non-SaaS" {
  const t = String(raw ?? "").trim().toLowerCase();
  if (t.includes("non")) return "non-SaaS";
  if (t.includes("saas")) return "SaaS";
  return "non-SaaS";
}

function parseDiscount(raw: unknown): number | null {
  if (raw === "" || raw === null || raw === undefined) return null;
  const n = typeof raw === "number" ? raw : Number(String(raw).trim());
  return Number.isFinite(n) ? n : null;
}

function parseSheet(workbook: XLSX.WorkBook, sheetName: string, cloud: "AWS" | "GCP"): ServiceRow[] {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "", header: 1, blankrows: false }) as unknown[][];
  const headerIdx = findHeaderRow(rows);
  if (headerIdx < 0) return [];
  return rows.slice(headerIdx + 1)
    .filter((row) => {
      const id = row[COL.id];
      return typeof id === "string" && /^[A-Z]-\d+/i.test(id.trim());
    })
    .map((row): ServiceRow => ({
      id: String(row[COL.id]).trim(),
      cloud,
      provider: String(row[COL.provider] ?? "").trim(),
      manufacturer: String(row[COL.manufacturer] ?? "").trim(),
      name: String(row[COL.name] ?? "").trim(),
      description: String(row[COL.description] ?? "").trim(),
      type: parseType(row[COL.type]),
      discount: parseDiscount(row[COL.discount]),
      price_link: String(row[COL.priceLink] ?? "").trim(),
      contact: String(row[COL.contact] ?? "").trim().replace(/\n/g, " | "),
      approval_date: parseDate(row[COL.approvalDate]),
      notes: String(row[COL.notes] ?? "").trim(),
      ps_services: parsePsServices(row[COL.psServices]),
    }));
}

function dedupeById(rows: ServiceRow[]): { unique: ServiceRow[]; dupCount: number } {
  const map = new Map<string, ServiceRow>();
  let dupCount = 0;
  for (const r of rows) {
    if (map.has(r.id)) dupCount++;
    map.set(r.id, r);
  }
  return { unique: Array.from(map.values()), dupCount };
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
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

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
    const res = await fetch(SHEET_URL, { redirect: "follow" });
    if (!res.ok) throw new Error(`Google Sheets download failed: HTTP ${res.status}`);
    const buf = new Uint8Array(await res.arrayBuffer());

    const workbook = XLSX.read(buf, { type: "array" });
    const gcp = parseSheet(workbook, "GCP", "GCP");
    const aws = parseSheet(workbook, "AWS", "AWS");
    const { unique, dupCount } = dedupeById([...gcp, ...aws]);

    if (unique.length === 0) throw new Error("Parsed 0 services — refusing to wipe table");

    const { data, error } = await supabase.rpc("roved5_replace_all", { p_data: unique });
    if (error) throw error;

    return jsonResponse(200, {
      ok: true,
      gcp: gcp.length,
      aws: aws.length,
      duplicates_dropped: dupCount,
      inserted: data,
      ms: Date.now() - start,
    });
  } catch (e) {
    return jsonResponse(500, {
      ok: false,
      error: errMsg(e),
      ms: Date.now() - start,
    });
  }
});
