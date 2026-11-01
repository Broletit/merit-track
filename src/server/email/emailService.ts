import { Resend } from "resend";
import { randomUUID } from "node:crypto";
import { getDatabase } from "@/server/db/mysql";
import type { EmailMessage, EmailProvider, EmailSendResult } from "./types";

class ConsoleEmailProvider implements EmailProvider {
  async send(message:EmailMessage):Promise<EmailSendResult> { console.info("[email:console]",{to:message.to,subject:message.subject,template:message.template}); return {providerMessageId:`console_${randomUUID()}`,status:"sent"}; }
}
class ResendEmailProvider implements EmailProvider {
  private client?:Resend;
  private settings(){const key=process.env.RESEND_API_KEY?.trim()||"",from=process.env.EMAIL_FROM?.trim()||"";if(!key||!from)throw new Error("Resend requires RESEND_API_KEY and EMAIL_FROM.");return{key,from};}
  async send(message:EmailMessage):Promise<EmailSendResult>{const settings=this.settings();const result=await (this.client??=new Resend(settings.key)).emails.send({from:settings.from,to:message.to,subject:message.subject,text:message.text,html:message.html});if(result.error)throw new Error(`Resend could not accept email: ${result.error.message}`);return{providerMessageId:result.data?.id,status:"sent"};}
}
function provider():EmailProvider {const kind=(process.env.EMAIL_PROVIDER||"console").toLowerCase();if(kind==="console")return new ConsoleEmailProvider();if(kind==="resend")return new ResendEmailProvider();throw new Error("EMAIL_PROVIDER must be console or resend.");}
export async function sendEmail(message:EmailMessage){
  const id=randomUUID(),db=getDatabase();
  await db.execute("INSERT INTO email_outbox(id,recipient,template_name,subject,payload_json,status) VALUES(?,?,?,?,?,'pending')",[id,message.to,message.template,message.subject,JSON.stringify({text:message.text,html:message.html})]);
  try {const result=await provider().send(message);await db.execute("UPDATE email_outbox SET status=?,provider_message_id=?,attempts=attempts+1,sent_at=CURRENT_TIMESTAMP(3),updated_at=CURRENT_TIMESTAMP(3) WHERE id=?",[result.status,result.providerMessageId||null,id]);return result;}
  catch(error){await db.execute("UPDATE email_outbox SET status='failed',attempts=attempts+1,last_error=?,updated_at=CURRENT_TIMESTAMP(3) WHERE id=?",[error instanceof Error?error.message:"Email provider failure",id]);throw error;}
}
