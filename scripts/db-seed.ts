import "./db-env";
import { getDatabase, closeDatabase } from "../src/server/db/mysql";
import { hashPasswordSync } from "../src/server/auth/password";

async function seed() {
  const account=process.env.SEED_ADMIN_USERNAME, password=process.env.SEED_ADMIN_PASSWORD;
  if(!account||!password||password.length<12)throw new Error("Set SEED_ADMIN_USERNAME and SEED_ADMIN_PASSWORD (at least 12 characters). No default password is used.");
  const db=getDatabase();
  await db.withTransaction(async()=>{
    if(await db.first("SELECT id FROM users WHERE mssv=?",[account]))throw new Error("Admin account already exists; seeding will not overwrite it.");
    await db.execute("INSERT INTO users(mssv,full_name,password_hash,role,is_active,must_change_pw) VALUES(?,?,?,'admin',1,1)",[account,process.env.SEED_ADMIN_NAME||"Quản trị hệ thống",hashPasswordSync(password)]);
  });
  console.log("Created administrator. No user data was overwritten.");
}
seed().catch(error=>{console.error(error instanceof Error?error.message:error);process.exitCode=1;}).finally(closeDatabase);
