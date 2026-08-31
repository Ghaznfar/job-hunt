import "server-only";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/lib/env";

export interface PutOptions {
  contentType: string;
  /** Logical folder, e.g. `resumes/<userId>` */
  prefix: string;
  filename: string;
}

export interface StorageDriver {
  put(body: Buffer, opts: PutOptions): Promise<{ key: string }>;
  getSignedUrl(key: string, expiresInSec?: number): Promise<string>;
  getBytes(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
}

function safeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120);
}

/** Local filesystem driver — files live outside the Next.js public directory. */
class LocalStorage implements StorageDriver {
  private root = path.resolve(process.cwd(), env.LOCAL_STORAGE_DIR);

  private resolve(key: string) {
    const full = path.resolve(this.root, key);
    if (!full.startsWith(this.root)) throw new Error("Invalid storage key");
    return full;
  }

  async put(body: Buffer, opts: PutOptions) {
    const key = `${opts.prefix}/${randomUUID()}-${safeName(opts.filename)}`;
    const full = this.resolve(key);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, body);
    return { key };
  }

  async getSignedUrl(key: string) {
    // No signing needed locally; served through an authenticated route handler.
    return `/api/files/${encodeURIComponent(key)}`;
  }

  async getBytes(key: string) {
    return fs.readFile(this.resolve(key));
  }

  async delete(key: string) {
    await fs.rm(this.resolve(key), { force: true });
  }
}

class S3Storage implements StorageDriver {
  private client: S3Client;
  constructor() {
    this.client = new S3Client({
      region: env.S3_REGION,
      endpoint: env.S3_ENDPOINT || undefined,
      forcePathStyle: env.S3_FORCE_PATH_STYLE,
      credentials:
        env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY
          ? { accessKeyId: env.S3_ACCESS_KEY_ID, secretAccessKey: env.S3_SECRET_ACCESS_KEY }
          : undefined,
    });
  }

  async put(body: Buffer, opts: PutOptions) {
    const key = `${opts.prefix}/${randomUUID()}-${safeName(opts.filename)}`;
    await this.client.send(
      new PutObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: key,
        Body: body,
        ContentType: opts.contentType,
        // Objects are private; no ACL.
      }),
    );
    return { key };
  }

  async getSignedUrl(key: string, expiresInSec = 300) {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: key }),
      { expiresIn: expiresInSec },
    );
  }

  async getBytes(key: string) {
    const res = await this.client.send(
      new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: key }),
    );
    const bytes = await res.Body!.transformToByteArray();
    return Buffer.from(bytes);
  }

  async delete(key: string) {
    await this.client.send(new DeleteObjectCommand({ Bucket: env.S3_BUCKET, Key: key }));
  }
}

let cached: StorageDriver | null = null;

export function getStorage(): StorageDriver {
  if (cached) return cached;
  cached = env.STORAGE_DRIVER === "s3" && env.S3_BUCKET ? new S3Storage() : new LocalStorage();
  return cached;
}

export async function deleteObject(key: string): Promise<void> {
  await getStorage().delete(key);
}
