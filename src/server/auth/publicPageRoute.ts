import { randomBytes } from "node:crypto";
import type { Database } from "@/server/db/mysql";

// Only these existing page families participate; no arbitrary rewrite destination.
export const detailPagePattern = new RegExp(
  String.raw`^(/dashboard/(admin|student|class-officer|faculty-officer)/(events|officer-events|submissions|reviews|students|criteria-templates|officer-submissions|officer-reviews)(?:/detail)?/)((?!create(?:/|$))[^/]+)(/(?:edit|candidates|configure))?$`,
);
export const detailApiPattern = new RegExp(
  String.raw`^(/api/(admin/(activities|submissions)|submissions/files)/)((?!(?:options|create)(?:/|$))[^/]+)(/(?:export|checkin|evaluate|decision))?$`,
);

function matchRoute(path: string) {
  const page = path.match(detailPagePattern);
  if (page) return {prefix:page[1], id:page[4], suffix:page[5] ?? "", section:page[3]};
  const api = path.match(detailApiPattern);
  if (api) return {prefix:api[1], id:api[4], suffix:api[5] ?? "", section:api[3] ?? "files"};
  return null;
}

export async function getPagePublicId(db: Database, path: string): Promise<string | null> {
  const match = matchRoute(path);
  if (!match || !/^[1-9]\d*$/.test(match.id) || !Number.isSafeInteger(Number(match.id))) return null;
  const table = match.section === "students" ? "users" : match.section === "criteria-templates" ? "criteria_templates"
    : match.section.includes("event") ? "events" : match.section === "activities" ? "activities" : match.section === "files" ? "submission_files" : "submissions";
  // Table name comes exclusively from the fixed allowlist above.
  if (!(await db.first(`SELECT 1 FROM ${table} WHERE id=?`, [Number(match.id)]))) return null;
  (await db.execute("INSERT IGNORE INTO public_page_routes(internal_path,token) VALUES(?,?)", [path, randomBytes(16).toString("hex")]));
  return ((await db.first("SELECT token FROM public_page_routes WHERE internal_path=?", [path])) as {token:string}).token;
}

export async function resolvePagePublicId(db: Database, path: string): Promise<string | null> {
  const match = matchRoute(path);
  if (!match || !/^[a-f0-9]{32}$/.test(match.id)) return null;
  const row = (await db.first("SELECT internal_path FROM public_page_routes WHERE token=?", [match.id])) as {internal_path:string}|undefined;
  const original = row ? matchRoute(row.internal_path) : null;
  if (!original || original.prefix !== match.prefix || original.suffix !== match.suffix) return null;
  return row!.internal_path;
}
