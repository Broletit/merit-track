import { createHash } from "node:crypto";
import { validateObjectKey } from "./objectKey";
import type { ObjectMetadata, StorageProvider, StoredObject } from "./types";

type OneDriveConfig = { tenantId:string; clientId:string; clientSecret:string; driveId:string; root:string };
type GraphItem = { id:string; size:number; eTag?:string; file?:{ mimeType?:string } };

export function getOneDriveConfig():OneDriveConfig {
  const tenantId=process.env.MICROSOFT_TENANT_ID?.trim()||"";
  const clientId=process.env.MICROSOFT_CLIENT_ID?.trim()||"";
  const clientSecret=process.env.MICROSOFT_CLIENT_SECRET?.trim()||"";
  const driveId=process.env.MICROSOFT_DRIVE_ID?.trim()||"";
  if(!tenantId||!clientId||!clientSecret||!driveId) throw new Error("OneDrive configuration requires MICROSOFT_TENANT_ID, MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET and MICROSOFT_DRIVE_ID.");
  return {tenantId,clientId,clientSecret,driveId,root:(process.env.MICROSOFT_STORAGE_ROOT||"MeritTrack/evidence").replace(/^\/+|\/+$/g,"")};
}

export class OneDriveStorageProvider implements StorageProvider {
  readonly kind="onedrive" as const;
  private token?:{value:string; expiresAt:number};
  constructor(private readonly config?:OneDriveConfig) {}
  private get settings(){return this.config??getOneDriveConfig();}
  private path(key:string){validateObjectKey(key); const root=this.settings.root; return [root,key].filter(Boolean).map(encodeURIComponent).join("/");}
  private async accessToken(){
    if(this.token&&this.token.expiresAt>Date.now()+30_000)return this.token.value;
    const settings=this.settings, body=new URLSearchParams({client_id:settings.clientId,client_secret:settings.clientSecret,scope:"https://graph.microsoft.com/.default",grant_type:"client_credentials"});
    const response=await fetch(`https://login.microsoftonline.com/${encodeURIComponent(settings.tenantId)}/oauth2/v2.0/token`,{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body});
    if(!response.ok)throw new Error(`Microsoft identity token request failed (${response.status}).`);
    const payload=await response.json() as {access_token?:string;expires_in?:number};
    if(!payload.access_token)throw new Error("Microsoft identity token response did not include an access token.");
    this.token={value:payload.access_token,expiresAt:Date.now()+(Number(payload.expires_in)||3600)*1000}; return this.token.value;
  }
  private async graph(path:string,init:RequestInit={}){
    const response=await fetch(`https://graph.microsoft.com/v1.0/drives/${encodeURIComponent(this.settings.driveId)}${path}`,{...init,headers:{authorization:`Bearer ${await this.accessToken()}`,...init.headers}});
    if(!response.ok)throw new Error(`Microsoft Graph storage request failed (${response.status}).`); return response;
  }
  private itemPath(key:string){return `/root:/${this.path(key)}`;}
  async put(key:string,content:Buffer,mimeType:string):Promise<ObjectMetadata>{
    const response=await this.graph(`${this.itemPath(key)}:/content`,{method:"PUT",headers:{"content-type":mimeType,"content-length":String(content.length)},body:new Uint8Array(content) as unknown as BodyInit});
    const item=await response.json() as GraphItem;
    return {size:Number(item.size),mimeType:item.file?.mimeType||mimeType,etag:item.eTag,checksumSha256:createHash("sha256").update(content).digest("hex")};
  }
  async head(key:string):Promise<ObjectMetadata>{
    const response=await this.graph(`${this.itemPath(key)}?$select=id,size,eTag,file`); const item=await response.json() as GraphItem;
    return {size:Number(item.size),mimeType:item.file?.mimeType||"application/octet-stream",etag:item.eTag};
  }
  async read(key:string):Promise<StoredObject>{
    const metadata=await this.head(key);
    const response=await this.graph(`${this.itemPath(key)}:/content`,{redirect:"follow"});
    if(!response.body)throw new Error("Microsoft Graph returned an empty file stream.");
    return {...metadata,stream:response.body};
  }
  async delete(key:string):Promise<void>{
    const response=await fetch(`https://graph.microsoft.com/v1.0/drives/${encodeURIComponent(this.settings.driveId)}${this.itemPath(key)}`,{method:"DELETE",headers:{authorization:`Bearer ${await this.accessToken()}`}});
    if(response.status===404)return; if(!response.ok)throw new Error(`Microsoft Graph storage delete failed (${response.status}).`);
  }
}
