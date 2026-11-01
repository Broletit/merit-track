import "./db-env";
import { readFile, mkdir, writeFile, lstat } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { getDatabase, closeDatabase } from "../src/server/db/mysql";
import { LocalStorageProvider } from "../src/server/storage/localStorage";

async function migrate() {
  const db = getDatabase(), provider = new LocalStorageProvider();
  const files = await db.rows<{id:number;object_key:string;size_bytes:number;mime_type:string}>("SELECT id,object_key,size_bytes,mime_type FROM submission_files WHERE storage_provider='local' AND status='ready' AND object_key LIKE 'submissions/legacy/%' ORDER BY id");
  const report: {id:number;key:string;size:number;sha256:string}[] = [];
  for (const file of files) {
    const name = file.object_key.split("/").pop()!;
    if (!/^[A-Za-z0-9_.-]+$/.test(name) || [".",".."].includes(name)) throw new Error(`Invalid legacy key for file ${file.id}`);
    let content: Buffer | undefined;
    for (const directory of ["uploads/submissions", "public/uploads/submissions"]) {
      try {
        const source = path.resolve(directory, name);
        if ((await lstat(source)).isSymbolicLink()) throw new Error(`Legacy source is a symlink: file ${file.id}`);
        content = await readFile(source); break;
      } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
    }
    if (!content) throw new Error(`Legacy file ${file.id} is missing. No files have been deleted.`);
    if (content.length !== file.size_bytes) throw new Error(`Legacy file ${file.id} has an unexpected size.`);
    const checksum = createHash("sha256").update(content).digest("hex");
    try { await provider.put(file.object_key, content, file.mime_type); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error; }
    const copied = await provider.readBuffer(file.object_key);
    if (copied.length !== file.size_bytes || createHash("sha256").update(copied).digest("hex") !== checksum) throw new Error(`Private file ${file.id} failed verification. Originals retained.`);
    await db.execute("UPDATE submission_files SET checksum_sha256=? WHERE id=? AND storage_provider='local'", [checksum, file.id]);
    report.push({id:file.id,key:file.object_key,size:copied.length,sha256:checksum});
    console.log(`Verified private copy: file ${file.id}`);
  }
  await mkdir("tmp/migration-reports", {recursive:true});
  await writeFile(`tmp/migration-reports/private-files-${Date.now()}.json`, JSON.stringify(report,null,2));
  console.log(`Verified ${report.length} private files. Original public/private legacy files were not deleted.`);
}
migrate().catch(error => {console.error(error instanceof Error ? error.message : error);process.exitCode=1;}).finally(closeDatabase);
