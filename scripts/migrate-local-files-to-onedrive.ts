import "./db-env";
import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { getDatabase, closeDatabase } from "../src/server/db/mysql";
import { LocalStorageProvider } from "../src/server/storage/localStorage";
import { OneDriveStorageProvider } from "../src/server/storage/oneDriveStorage";

async function migrate(){
  const db=getDatabase(),local=new LocalStorageProvider(),remote=new OneDriveStorageProvider();
  const files=await db.rows<{id:number;object_key:string;mime_type:string;size_bytes:number|null}>("SELECT id,object_key,mime_type,size_bytes FROM submission_files WHERE status='ready' AND storage_provider='local' ORDER BY id");
  const report:{migrated:number[];failed:{id:number;error:string}[]}={migrated:[],failed:[]};
  for(const file of files){try{
    const source=await local.read(file.object_key),bytes=Buffer.from(await new Response(source.stream).arrayBuffer());
    const before=createHash("sha256").update(bytes).digest("hex"),existing=await remote.head(file.object_key).catch(()=>null);
    const metadata=existing&&existing.size===bytes.length?existing:await remote.put(file.object_key,bytes,file.mime_type||source.mimeType);
    if(metadata.size!==bytes.length)throw new Error("Remote size verification failed.");
    await db.execute("UPDATE submission_files SET storage_provider='onedrive',etag=?,checksum_sha256=? WHERE id=? AND storage_provider='local'",[metadata.etag||null,before,file.id]);report.migrated.push(file.id);
  }catch(error){report.failed.push({id:file.id,error:error instanceof Error?error.message:String(error)});}}
  await writeFile(`tmp/migration-reports/local-to-onedrive-${Date.now()}.json`,JSON.stringify(report,null,2));
  if(report.failed.length)throw new Error(`${report.failed.length} files were not migrated; local files were retained.`);
  console.log(`Migrated ${report.migrated.length} files to OneDrive. Local copies were retained.`);
}
migrate().catch(error=>{console.error(error instanceof Error?error.message:error);process.exitCode=1;}).finally(closeDatabase);
