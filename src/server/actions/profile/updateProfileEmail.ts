"use server";

import { isValidGmailAddress } from "@/lib/validation/gmail";
import { revalidatePath } from "next/cache";
import { requireLogin } from "@/server/auth/guards";
import { getDatabase } from "@/server/db/mysql";
import { writeAuditLog } from "@/server/audit/writeAuditLog";

export type ProfileEmailState = {ok:boolean;message:string;email?:string;fieldError?:string};

export async function updateProfileEmail(_previous:ProfileEmailState, form:FormData):Promise<ProfileEmailState> {
  try {
    const user=await requireLogin();
    if (!["student","class_officer","faculty_officer"].includes(user.role)) throw new Error("Không có quyền cập nhật email tại đây.");
    const email=String(form.get("email")??"").trim().toLowerCase();
    if (!isValidGmailAddress(email)) {
      return {ok:false,message:"",fieldError:email?"Gmail không hợp lệ.":"Vui lòng nhập email để khôi phục mật khẩu."};
    }
    const db=getDatabase();
    (await (async () => (await db.withTransaction(async ()=>{
      const current=(await db.first("SELECT email FROM users WHERE id=? AND is_active=1 AND role IN ('student','class_officer','faculty_officer')", [user.id])) as {email:string|null}|undefined;
      if (!current) throw new Error("Không tìm thấy tài khoản đang hoạt động.");
      if ((current.email??"").trim().toLowerCase()===email) throw new Error("Email chưa có thay đổi.");
      // The session determines the owner. No ID or other profile field is accepted from the form.
      (await db.execute("UPDATE users SET email=?,updated_at=CURRENT_TIMESTAMP(3) WHERE id=?", [email, user.id]));
      (await db.execute("UPDATE password_reset_requests SET consumed_at=? WHERE user_id=? AND consumed_at IS NULL", [Date.now(), user.id]));
      (await writeAuditLog({db,actorUserId:user.id,action:"user.email.update",entityType:"user",entityId:user.id,
        reason:"Người dùng tự cập nhật email khôi phục.",before:{email:current.email},after:{email}}));
    })))());
    revalidatePath("/dashboard","layout");
    revalidatePath("/forgot-password");
    return {ok:true,message:"Đã cập nhật email khôi phục mật khẩu.",email};
  } catch(error) {
    // Preserve authentication redirects from Next.js rather than converting them to a success response.
    if (error && typeof error==="object" && "digest" in error && String(error.digest).startsWith("NEXT_REDIRECT")) throw error;
    return {ok:false,message:error instanceof Error?error.message:"Không thể cập nhật email. Vui lòng thử lại."};
  }
}
