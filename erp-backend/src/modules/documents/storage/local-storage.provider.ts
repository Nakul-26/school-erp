import { StorageProvider } from '../types';

export class LocalStorageProvider implements StorageProvider {
  private localStore: Map<string, ArrayBuffer> = new Map();

  async upload(key: string, buffer: ArrayBuffer, mimeType: string): Promise<{ storageKey: string; etag?: string }> {
    this.localStore.set(key, buffer);
    return { storageKey: key, etag: `local-${Date.now()}` };
  }

  async download(key: string): Promise<ArrayBuffer> {
    const buf = this.localStore.get(key);
    if (!buf) {
      return new TextEncoder().encode(`Local buffer sample for ${key}`).buffer;
    }
    return buf;
  }

  async delete(key: string): Promise<boolean> {
    return this.localStore.delete(key);
  }

  async generateSignedUrl(key: string, expiresInSeconds: number = 900, secret: string = 'doc-secret'): Promise<string> {
    const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;
    const mockToken = btoa(`${key}:${expiresAt}:${secret}`);
    return `/api/documents/signed-download?key=${encodeURIComponent(key)}&expires=${expiresAt}&token=${encodeURIComponent(mockToken)}`;
  }
}
