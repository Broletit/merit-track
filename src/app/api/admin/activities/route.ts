import { activityCohortClause } from "@/server/cohorts/sql";
import { NextResponse } from "next/server";
import { getDatabase } from "@/server/db/mysql";
import { requireAdminContext } from "@/server/auth/guards";
import { createActivity } from "@/server/actions/activities/createActivity";

export async function GET(req:Request) {
  await requireAdminContext();
  const db = getDatabase();

  const items = (await db.rows(`
    SELECT
      a.id,
      a.title,
      a.description,
      a.audience_type,
      a.status,
      a.start_at,
      a.end_at,
      a.registration_start_at,
      a.registration_end_at,
      a.checkin_start_at,
      a.checkin_end_at,
      a.conduct_score,
      a.max_registrations,
      a.created_at,
      COUNT(ar.id) AS registered_count,
      SUM(CASE WHEN ar.status = 'attended' THEN 1 ELSE 0 END) AS attended_count
    FROM activities a
    LEFT JOIN activity_registrations ar ON ar.activity_id = a.id AND ar.status<>'cancelled'
    WHERE ${activityCohortClause(new URL(req.url).searchParams.get("cohort"))}
    GROUP BY a.id
    ORDER BY CAST(a.created_at AS DATETIME(3)) DESC, a.id DESC
  `, []));

  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const formData = new FormData();
    const mapping: Record<string,string> = {title:"title",description:"description",audience_type:"audienceType",status:"status",start_at:"startAt",end_at:"endAt",registration_start_at:"registrationStartAt",registration_end_at:"registrationEndAt",conduct_score:"conductScore",conduct_category_id:"conductCategoryId",organizer_level:"organizerLevel"};
    for (const [key,field] of Object.entries(mapping)) if(body[key] !== undefined) formData.set(field,String(body[key]));
    if(!body.organizer_level) formData.set("organizerLevel","faculty");
    if(body.max_registrations!==undefined)formData.set("maxRegistrations",String(body.max_registrations??""));
    if(body.qr_checkin_enabled) formData.set("qrCheckinEnabled","on");
    for(const id of body.class_ids ?? []) formData.append("classIds",String(id));
    for(const cohort of body.cohorts ?? []) formData.append("cohorts",String(cohort));
    return NextResponse.json(await createActivity(formData));
  } catch (error) {
    return NextResponse.json({error:error instanceof Error ? error.message : "Không thể tạo hoạt động."},{status:400});
  }
}
