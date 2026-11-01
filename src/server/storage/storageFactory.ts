import { LocalStorageProvider } from "./localStorage";
import { OneDriveStorageProvider } from "./oneDriveStorage";
import type { StorageKind, StorageProvider } from "./types";

export function configuredStorageKind(): StorageKind {
  const value = process.env.STORAGE_PROVIDER || "local";
  if (value !== "local" && value !== "onedrive") throw new Error(`Invalid STORAGE_PROVIDER: ${value}`);
  return value;
}
export function getStorageProvider(kind: StorageKind = configuredStorageKind()): StorageProvider {
  if (kind === "local") return new LocalStorageProvider();
  if (kind === "onedrive") return new OneDriveStorageProvider();
  throw new Error("Unsupported storage provider.");
}
