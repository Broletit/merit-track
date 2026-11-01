import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, mkdir, symlink } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { LocalStorageProvider } from "../../src/server/storage/localStorage";
import { OneDriveStorageProvider, getOneDriveConfig } from "../../src/server/storage/oneDriveStorage";
import { getStorageProvider } from "../../src/server/storage/storageFactory";
import { validateObjectKey, createEvidenceKey } from "../../src/server/storage/objectKey";
import { validateEvidenceFile, validateEvidenceMetadata } from "../../src/server/storage/filePolicy";

test("local provider streams private objects without cloud credentials", async () => {
  const directory=await mkdtemp(path.join(os.tmpdir(),"merit-storage-"));
  try {
    const provider=new LocalStorageProvider(directory), key=createEvidenceKey(8,153,"A2",".pdf"), body=Buffer.from("%PDF-1.7\ntest");
    await provider.put(key,body,"application/pdf");
    assert.equal((await provider.head(key)).size,body.length);
    const reader=(await provider.read(key)).stream.getReader(),chunks:Uint8Array[]=[];
    for(;;){const chunk=await reader.read();if(chunk.done)break;chunks.push(chunk.value);}
    assert.deepEqual(Buffer.concat(chunks),body);
    await assert.rejects(provider.put(key,body,"application/pdf"),{code:"EEXIST"});
    await provider.delete(key);await provider.delete(key);
    await assert.rejects(provider.head(key),{code:"ENOENT"});
  } finally {await rm(directory,{recursive:true,force:true});}
});
test("traversal, public roots and unsupported provider configuration are rejected", () => {
  for(const key of ["../secret","/secret","submissions/../secret","submissions\\secret","submissions//secret","C:/secret"])assert.throws(()=>validateObjectKey(key));
  assert.throws(()=>new LocalStorageProvider("public/uploads"));
  const previous=process.env.STORAGE_PROVIDER;
  process.env.STORAGE_PROVIDER="invalid";assert.throws(()=>getStorageProvider(),/STORAGE_PROVIDER/);
  process.env.STORAGE_PROVIDER="local";assert.equal(getStorageProvider().kind,"local");
  if(previous===undefined)delete process.env.STORAGE_PROVIDER;else process.env.STORAGE_PROVIDER=previous;
});
test("PDF/PNG evidence policy rejects empty, oversized, renamed and invalid signature files", async () => {
  await validateEvidenceFile(new File(["%PDF-1.7\n"],"evidence.pdf",{type:"application/pdf"}));
  await validateEvidenceFile(new File([new Uint8Array([137,80,78,71,13,10,26,10])],"evidence.png",{type:"image/png"}));
  assert.throws(()=>validateEvidenceMetadata("empty.pdf","application/pdf",0));
  assert.throws(()=>validateEvidenceMetadata("large.pdf","application/pdf",10485761));
  assert.throws(()=>validateEvidenceMetadata("script.svg","image/svg+xml",100));
  assert.throws(()=>validateEvidenceMetadata("renamed.pdf","image/png",100));
  await assert.rejects(validateEvidenceFile(new File(["invalid"],"bad.pdf",{type:"application/pdf"})));
});
test("local storage rejects a symlink escaping its private root", async t => {
  const directory=await mkdtemp(path.join(os.tmpdir(),"merit-symlink-"));
  try {
    await mkdir(path.join(directory,"root"));await mkdir(path.join(directory,"outside"));
    try{await symlink(path.join(directory,"outside"),path.join(directory,"root","escape"),"junction");}
    catch(error){if((error as NodeJS.ErrnoException).code==="EPERM"){t.skip("OS does not permit test symlinks");return;}throw error;}
    await assert.rejects(new LocalStorageProvider(path.join(directory,"root")).put("escape/a.pdf",Buffer.from("test"),"application/pdf"));
  } finally {await rm(directory,{recursive:true,force:true});}
});
test("OneDrive configuration is lazy until the provider is selected", () => {
  const names=["MICROSOFT_TENANT_ID","MICROSOFT_CLIENT_ID","MICROSOFT_CLIENT_SECRET","MICROSOFT_DRIVE_ID"] as const;
  const before=Object.fromEntries(names.map(name=>[name,process.env[name]]));
  try {
    for(const name of names)delete process.env[name];
    const lazy=new OneDriveStorageProvider();assert.equal(lazy.kind,"onedrive");assert.throws(()=>getOneDriveConfig());
    process.env.STORAGE_PROVIDER="local";assert.equal(getStorageProvider().kind,"local");
  } finally {for(const name of names){const value=before[name];if(value===undefined)delete process.env[name];else process.env[name]=value;}}
});
