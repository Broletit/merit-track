import "./db-env";
import { closeDatabase, getDatabase } from "../src/server/db/mysql";
import { evaluateAutoCriteria } from "../src/server/events/evaluateAutoCriteria";

type EventRow = { id: number; type: "student" | "officer" };
type CriterionRow = { code: string; group_code: string; is_required: number; min_required: number };
type UserRow = { id: number };

function argument(name: string) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? Number(process.argv[index + 1]) : 0;
}

function assessment(criteria: CriterionRow[], passed: Set<string>) {
  const groups = new Map<string, { achieved: number; min: number; missingMandatory: number }>();
  for (const criterion of criteria) {
    const group = groups.get(criterion.group_code) ?? { achieved: 0, min: Number(criterion.min_required), missingMandatory: 0 };
    if (passed.has(criterion.code)) group.achieved += 1;
    else if (Number(criterion.is_required) === 1) group.missingMandatory += 1;
    groups.set(criterion.group_code, group);
  }
  const missingRequired = Array.from(groups.values()).reduce(
    (total, group) => total + group.missingMandatory + Math.max(0, group.min - group.achieved - group.missingMandatory),
    0,
  );
  return { achieved: passed.size, total: criteria.length, missingRequired };
}

async function run() {
  const db = getDatabase();
  const eventId = argument("eventId");
  const termId = argument("termId");
  const conditions = ["criteria_template_id IS NOT NULL"];
  const values: number[] = [];
  if (eventId > 0) { conditions.push("id=?"); values.push(eventId); }
  if (termId > 0) { conditions.push("term_id=?"); values.push(termId); }
  const events = await db.rows<EventRow>(`SELECT id,type FROM events WHERE ${conditions.join(" AND ")} ORDER BY id`, values);

  for (const event of events) {
    const criteria = await db.rows<CriterionRow>(`SELECT i.code,i.group_code,i.is_required,g.min_required FROM event_criteria_items i INNER JOIN event_criteria_groups g ON g.event_id=i.event_id AND g.code=i.group_code WHERE i.event_id=? ORDER BY g.sort_order,i.sort_order`, [event.id]);
    const roles = event.type === "student" ? ["student", "class_officer"] : ["class_officer", "faculty_officer"];
    const users = await db.rows<UserRow>(`SELECT id FROM users WHERE is_active=1 AND role IN (?,?) ORDER BY id`, roles);
    for (const user of users) {
      const passed = new Set((await evaluateAutoCriteria({ eventId: event.id, userId: user.id })).filter((item) => item.passed).map((item) => item.criteriaCode));
      const result = assessment(criteria, passed);
      await db.execute(`INSERT INTO report_assessment_cache(event_id,user_id,assessment_type,achieved_criteria,total_criteria,missing_required,is_eligible,refreshed_at) VALUES(?,?,?,?,?,?,?,CURRENT_TIMESTAMP(3)) ON DUPLICATE KEY UPDATE assessment_type=VALUES(assessment_type),achieved_criteria=VALUES(achieved_criteria),total_criteria=VALUES(total_criteria),missing_required=VALUES(missing_required),is_eligible=VALUES(is_eligible),refreshed_at=CURRENT_TIMESTAMP(3)`, [event.id, user.id, event.type, result.achieved, result.total, result.missingRequired, result.missingRequired === 0]);
    }
    await db.execute(`INSERT INTO report_cache_state(cache_key,revision,refreshed_at) VALUES(?,1,CURRENT_TIMESTAMP(3)) ON DUPLICATE KEY UPDATE revision=revision+1,refreshed_at=CURRENT_TIMESTAMP(3)`, [`event:${event.id}`]);
    console.log(`Refreshed event ${event.id} (${event.type}).`);
  }
}

run().catch((error) => { console.error(error); process.exitCode = 1; }).finally(closeDatabase);
