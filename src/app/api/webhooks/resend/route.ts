import { NextResponse } from "next/server";
import { Webhook } from "svix";
import { getDatabase } from "@/server/db/mysql";

const statusFor:Record<string,string>={"email.sent":"sent","email.delivered":"delivered","email.bounced":"bounced","email.complained":"complained","email.opened":"opened","email.clicked":"clicked"};
export async function POST(request:Request){
  const secret=process.env.RESEND_WEBHOOK_SECRET?.trim();
  if(!secret)return NextResponse.json({message:"Webhook is not configured."},{status:503});
  const payload=await request.text();
  try{
    const verified=new Webhook(secret).verify(payload,{"svix-id":request.headers.get("svix-id")||"","svix-timestamp":request.headers.get("svix-timestamp")||"","svix-signature":request.headers.get("svix-signature")||""}) as unknown as {type?:string;data?:{email_id?:string}};
    const status=statusFor[verified.type||""];const messageId=verified.data?.email_id;
    if(status&&messageId){const timestampColumn={sent:"sent_at",delivered:"delivered_at",bounced:"bounced_at",complained:"complained_at",opened:"opened_at",clicked:"clicked_at"}[status]||"updated_at";await getDatabase().execute(`UPDATE email_outbox SET status=?,provider_event_id=?,${timestampColumn}=CURRENT_TIMESTAMP(3),updated_at=CURRENT_TIMESTAMP(3) WHERE provider_message_id=?`,[status,request.headers.get("svix-id"),messageId]);}
    return NextResponse.json({ok:true});
  }catch{return NextResponse.json({message:"Invalid webhook signature."},{status:401});}
}
