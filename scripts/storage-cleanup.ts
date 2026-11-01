import "./db-env";
import { getDatabase, closeDatabase } from "../src/server/db/mysql";
import { getStorageProvider } from "../src/server/storage/storageFactory";
import type { StorageKind } from "../src/server/storage/types";

async function cleanup() {
  const db=getDatabase();
  const deleted=await db.rows<{id:number;object_key:string;storage_provider:StorageKind}>("SELECT id,object_key,storage_provider FROM submission_files WHERE status='deleted' AND object_deleted_at IS NULL ORDER BY deleted_at,id LIMIT 100");
  for(const file of deleted) {
    await getStorageProvider(file.storage_provider).delete(file.object_key);
    await db.execute("UPDATE submission_files SET object_deleted_at=CURRENT_TIMESTAMP(3) WHERE id=? AND status='deleted'",[file.id]);
  }
  console.log(`Cleaned ${deleted.length} deleted evidence objects.`);
}
cleanup().catch(error=>{console.error(error instanceof Error?error.message:error);process.exitCode=1;}).finally(closeDatabase);
