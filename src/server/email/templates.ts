import type { EmailMessage } from "./types";

const escapeHtml=(value:string)=>value.replace(/[&<>'"]/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[char]||char);
export function passwordResetEmail(to:string,code:string):EmailMessage {
  const safeCode=escapeHtml(code);
  return {to,template:"password_reset",subject:"Mã xác nhận khôi phục mật khẩu – Thi đua Khen thưởng FET",
    text:`Mã xác nhận của bạn: ${code}\nMã có hiệu lực trong 10 phút và chỉ sử dụng một lần. Không chia sẻ mã này cho bất kỳ ai.`,
    html:`<main style="font-family:Arial,sans-serif;color:#0f172a"><h2>Khôi phục mật khẩu</h2><p>Mã xác nhận của bạn là:</p><p style="font-size:28px;font-weight:700;letter-spacing:6px">${safeCode}</p><p>Mã có hiệu lực trong 10 phút và chỉ sử dụng một lần.</p><p>Không chia sẻ mã này cho bất kỳ ai.</p></main>`};
}
