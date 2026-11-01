import { NextResponse } from "next/server";
import { getDatabase } from "@/server/db/mysql";
import { getSessionUser } from "@/server/auth/getSessionUser";
import { canReadSubmissionFile } from "@/server/auth/canReadSubmissionFile";
import { getStorageProvider } from "@/server/storage/storageFactory";
import { authorizeEvidenceWrite, removeEvidenceObjects, refreshEvidenceEvaluation } from "@/server/storage/evidenceService";
import type { StorageKind } from "@/server/storage/types";

type FileRow = {id:number; submission_id:number; criteria_code:string; original_name:string; object_key:string; storage_provider:StorageKind; mime_type:string; size_bytes:number; user_id:number; class_id:number|null; submitted_at:string|null; has_support:number};
async function findFile(id: string) {
  const numeric = Number(id);
  if (!Number.isSafeInteger(numeric) || numeric <= 0) return undefined;
  return getDatabase().first<FileRow>(`SELECT sf.*,s.user_id,s.class_id,s.submitted_at,
    EXISTS(SELECT 1 FROM submission_support_requests sr WHERE sr.submission_id=s.id AND sr.status='open') has_support
    FROM submission_files sf JOIN submissions s ON s.id=sf.submission_id
    WHERE sf.id=? AND sf.status='ready' AND sf.deleted_at IS NULL`, [numeric]);
}
export async function GET(_: Request, context: {params:Promise<{id:string}>}) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({message:"Vui lòng đăng nhập."}, {status:401});
  const file = await findFile((await context.params).id);
  if (!file) return NextResponse.json({message:"Không tìm thấy tệp."}, {status:404});
  if (!await canReadSubmissionFile(getDatabase(), user, file)) return NextResponse.json({message:"Bạn không có quyền xem tệp này."}, {status:403});
  const provider = getStorageProvider(file.storage_provider);
  try {
    const object = await provider.read(file.object_key);
    return new NextResponse(object.stream, {headers:{
      "Content-Type":file.mime_type, "Content-Length":String(object.size),
      "Cache-Control":"private, no-store", "X-Content-Type-Options":"nosniff",
      "Content-Disposition":`inline; filename*=UTF-8''${encodeURIComponent(file.original_name)}`,
    }});
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return NextResponse.json({message:"Không tìm thấy tệp."}, {status:404});
    throw error;
  }
}
export async function DELETE(_: Request, context: {params:Promise<{id:string}>}) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({message:"Vui lòng đăng nhập."}, {status:401});
  const file = await findFile((await context.params).id);
  if (!file) return NextResponse.json({message:"Không tìm thấy tệp."}, {status:404});
  try {
    await getDatabase().withTransaction(async () => {
      await authorizeEvidenceWrite(user, file.submission_id, [file.criteria_code]);
      await getDatabase().execute("UPDATE submission_files SET status='deleted',deleted_at=CURRENT_TIMESTAMP(3) WHERE id=?", [file.id]);
      await refreshEvidenceEvaluation(file.submission_id);
    });
    await removeEvidenceObjects([file]);
    return NextResponse.json({ok:true});
  } catch (error) { return NextResponse.json({message:error instanceof Error ? error.message : "Không thể xóa minh chứng."}, {status:403}); }
}
