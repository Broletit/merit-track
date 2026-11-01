import { sendEmail } from "./emailService";
import { passwordResetEmail } from "./templates";
export function getResetMailConfig(){const secret=process.env.PASSWORD_RESET_SECRET||"";if(secret.length<32)throw new Error("PASSWORD_RESET_SECRET phải có ít nhất 32 ký tự.");return{secret};}
export async function sendPasswordResetCode(to:string,code:string){return sendEmail(passwordResetEmail(to,code));}
