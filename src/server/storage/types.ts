export type StorageKind = "local" | "onedrive";
export type ObjectMetadata = { size: number; mimeType: string; etag?: string; checksumSha256?: string };
export type StoredObject = ObjectMetadata & { stream: ReadableStream<Uint8Array> };
export interface StorageProvider {
  readonly kind: StorageKind;
  put(key: string, content: Buffer, mimeType: string): Promise<ObjectMetadata>;
  head(key: string): Promise<ObjectMetadata>;
  read(key: string): Promise<StoredObject>;
  delete(key: string): Promise<void>;
}
