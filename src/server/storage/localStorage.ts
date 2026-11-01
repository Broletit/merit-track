import { createReadStream } from "node:fs";
import { mkdir, realpath, lstat, readFile, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { createHash } from "node:crypto";
import { validateObjectKey } from "./objectKey";
import type { StorageProvider } from "./types";

export class LocalStorageProvider implements StorageProvider {
  readonly kind = "local" as const;
  readonly root: string;
  constructor(root = process.env.LOCAL_STORAGE_ROOT || "storage") {
    this.root = path.resolve(root);
    const publicRoot = path.resolve("public");
    if (this.root.toLowerCase() === publicRoot.toLowerCase() || this.root.toLowerCase().startsWith((publicRoot + path.sep).toLowerCase())) throw new Error("Local storage must be outside public/.");
  }
  private async resolve(key: string, create = false) {
    validateObjectKey(key);
    if (create) await mkdir(this.root, { recursive: true });
    const root = await realpath(this.root);
    const target = path.join(root, ...key.split("/"));
    const parts = key.split("/");
    let current = root;
    for (let index = 0; index < parts.length - 1; index++) {
      current = path.join(current, parts[index]);
      if (create) await mkdir(current, { recursive: true });
      if ((await lstat(current)).isSymbolicLink()) throw new Error("Storage symlinks are forbidden.");
      const resolved = await realpath(current);
      if (!resolved.toLowerCase().startsWith((root + path.sep).toLowerCase())) throw new Error("Object escapes storage root.");
    }
    try { if ((await lstat(target)).isSymbolicLink()) throw new Error("Storage symlinks are forbidden."); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
    return target;
  }
  async put(key: string, content: Buffer, mimeType: string) {
    const target = await this.resolve(key, true);
    try { await writeFile(target, content, { flag: "wx", mode: 0o600 }); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") await unlink(target).catch(() => {});
      throw error;
    }
    return { size: content.length, mimeType, checksumSha256: createHash("sha256").update(content).digest("hex") };
  }
  async head(key: string) {
    const file = await stat(await this.resolve(key));
    if (!file.isFile()) throw new Error("Storage object is not a file.");
    return { size: file.size, mimeType: key.endsWith(".pdf") ? "application/pdf" : key.endsWith(".png") ? "image/png" : "application/octet-stream" };
  }
  async read(key: string) {
    const metadata = await this.head(key);
    return { ...metadata, stream: Readable.toWeb(createReadStream(await this.resolve(key))) as ReadableStream<Uint8Array> };
  }
  async readBuffer(key: string) { return readFile(await this.resolve(key)); }
  async delete(key: string) {
    try { await unlink(await this.resolve(key)); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
  }
}
