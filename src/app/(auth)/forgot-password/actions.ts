"use server";

import { isValidGmailAddress } from "@/lib/validation/gmail";
import { headers } from "next/headers";
import { getDatabase } from "@/server/db/mysql";
import { issuePasswordReset, consumePasswordReset } from "@/server/auth/passwordReset";
import { getResetMailConfig, sendPasswordResetCode } from "@/server/email/resetMail";
import { hashPassword } from "@/server/auth/password";

export type ResetState = {ok:boolean;message:string;challengeId?:string;completed?:boolean;expiresAt?:number;resendAt?:number;email?:string};

export async function requestResetCode(_previous:ResetState,form:FormData):Promise<ResetState> {
  try {
    const account=String(form.get("account")??"").trim();
    const email=String(form.get("email")??"").trim();
    if (!account || account.length>100 || !isValidGmailAddress(email)) return {ok:false,message:"Vui lòng nhập MSSV và Gmail hợp lệ đã đăng ký (@gmail.com)."};
    const db=getDatabase();
    const recipient=(await db.first("SELECT id,email FROM users WHERE lower(mssv)=? AND lower(trim(email))=? AND is_active=1", [account.toLowerCase(), email.toLowerCase()])) as {id:number;email:string}|undefined;
    if (!recipient) return {ok:false,message:"Gmail này không khớp với MSSV đã nhập. Vui lòng kiểm tra lại."};
    const config=getResetMailConfig();
    const requestHeaders=await headers();
    const ip=requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim()||"local";
    const result=(await issuePasswordReset(db,account,email,ip,config.secret,Date.now(),60_000));
    try {
      await sendPasswordResetCode(recipient.email,result.code);
    } catch {
      (await db.execute("DELETE FROM password_reset_requests WHERE id=?", [result.id]));
      return {ok:false,message:"Chưa gửi được mã xác nhận. Vui lòng thử lại hoặc liên hệ quản trị viên."};
    }
    (await db.execute("UPDATE password_reset_requests SET consumed_at=? WHERE user_id=? AND id<>? AND consumed_at IS NULL", [Date.now(), recipient.id, result.id]));
    return {ok:true,challengeId:result.id,expiresAt:result.expiresAt,resendAt:Date.now()+60_000,email:recipient.email,message:"Mã xác nhận đã được gửi đến "+recipient.email+"."};
  } catch(error) { return {ok:false,message:error instanceof Error?error.message:"Không thể gửi yêu cầu khôi phục mật khẩu."}; }
}

export async function resetPassword(_previous:ResetState,form:FormData):Promise<ResetState> {
  try {
    const challenge=String(form.get("challengeId")??"");
    const code=String(form.get("code")??"").trim();
    const password=String(form.get("newPassword")??"");
    const confirm=String(form.get("confirmPassword")??"");
    if (!/^[a-f0-9]{64}$/.test(challenge) || !/^\d{6}$/.test(code)) return {ok:false,message:"Vui lòng nhập mã xác nhận gồm 6 chữ số."};
    if (password.length<8 || Buffer.byteLength(password,"utf8")>72) return {ok:false,message:"Mật khẩu mới phải có ít nhất 8 ký tự và không vượt quá 72 byte."};
    if (password!==confirm) return {ok:false,message:"Mật khẩu xác nhận chưa khớp."};
    const config=getResetMailConfig();
    (await consumePasswordReset(getDatabase(),challenge,code,await hashPassword(password),config.secret));
    return {ok:true,completed:true,message:"Đã đổi mật khẩu. Các phiên đăng nhập cũ đã được kết thúc; vui lòng đăng nhập bằng mật khẩu mới."};
  } catch(error) { return {ok:false,message:error instanceof Error?error.message:"Không thể đặt lại mật khẩu."}; }
}
