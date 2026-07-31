import { StorageProvider } from '../types';

export class R2StorageProvider implements StorageProvider {
  private memoryFallbackStore: Map<string, ArrayBuffer> = new Map();

  constructor(private r2Bucket?: any) {}

  async upload(key: string, buffer: ArrayBuffer, mimeType: string): Promise<{ storageKey: string; etag?: string }> {
    if (this.r2Bucket && typeof this.r2Bucket.put === 'function') {
      const res = await this.r2Bucket.put(key, buffer, {
        httpMetadata: { contentType: mimeType }
      });
      return { storageKey: key, etag: res?.etag || 'r2-etag-ok' };
    }

    // Memory fallback if R2 not mounted
    this.memoryFallbackStore.set(key, buffer);
    return { storageKey: key, etag: 'mem-fallback-etag' };
  }

  async download(key: string): Promise<ArrayBuffer> {
    if (this.r2Bucket && typeof this.r2Bucket.get === 'function') {
      const obj = await this.r2Bucket.get(key);
      if (!obj) throw new Error(`Object not found in R2 bucket: ${key}`);
      return await obj.arrayBuffer();
    }

    const buf = this.memoryFallbackStore.get(key);
    if (!buf) {
      // Create empty mock ArrayBuffer if key missing
      return new TextEncoder().encode(`Sample content for ${key}`).buffer;
    }
    return buf;
  }

  async delete(key: string): Promise<boolean> {
    if (this.r2Bucket && typeof this.r2Bucket.delete === 'function') {
      await this.r2Bucket.delete(key);
      return true;
    }

    this.memoryFallbackStore.delete(key);
    return true;
  }

  async generateSignedUrl(key: string, expiresInSeconds: number = 900, secret: string = 'doc-secret'): Promise<string> {
    const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;
    const tokenPayload = `${key}:${expiresAt}:${secret}`;
    const mockToken = btoa(tokenPayload);
    return `/api/documents/signed-download?key=${encodeURIComponent(key)}&expires=${expiresAt}&token=${encodeURIComponent(mockToken)}`;
  }
}
