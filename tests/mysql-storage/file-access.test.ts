import test from "node:test";
import assert from "node:assert/strict";
import { canReadSubmissionFile } from "../../src/server/auth/canReadSubmissionFile";
import type { Database } from "../../src/server/db/mysql";

test("file authorization preserves ownership, role, login context, membership and assignment",async()=>{
  let related=false;
  const db={first:async()=>related?{ok:1}:undefined} as unknown as Database;
  const file={user_id:10,class_id:20,submitted_at:"2026-10-28T00:00:00Z",has_support:0};
  assert.equal(await canReadSubmissionFile(db,{id:10,role:"student",loginContext:"student"},file),true);
  assert.equal(await canReadSubmissionFile(db,{id:1,role:"admin",loginContext:"admin"},file),true);
  assert.equal(await canReadSubmissionFile(db,{id:1,role:"admin",loginContext:"student"},file),false);
  for(const role of ["class_officer","faculty_officer"]){
    related=false;assert.equal(await canReadSubmissionFile(db,{id:2,role,loginContext:role},file),false);
    related=true;assert.equal(await canReadSubmissionFile(db,{id:2,role,loginContext:role},file),true);
    assert.equal(await canReadSubmissionFile(db,{id:2,role,loginContext:"student"},file),false);
    assert.equal(await canReadSubmissionFile(db,{id:2,role,loginContext:role},{...file,submitted_at:null}),false);
    assert.equal(await canReadSubmissionFile(db,{id:2,role,loginContext:role},{...file,submitted_at:null,has_support:1}),true);
  }
});
