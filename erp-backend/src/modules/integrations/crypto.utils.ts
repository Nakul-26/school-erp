/**
 * Web Crypto SHA-256 HMAC & Encryption Helpers for Webhooks & Credentials
 */

export async function generateHMACSignature(secret: string, payload: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(payload);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  const hashArray = Array.from(new Uint8Array(signatureBuffer));
  const hex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return `sha256=${hex}`;
}

export function maskSecret(secret: string): string {
  if (!secret) return '****';
  if (secret.length <= 8) return '****' + secret.slice(-2);
  return secret.slice(0, 4) + '****' + secret.slice(-4);
}

export function encryptSecret(secret: string): string {
  // Simple Base64 obfuscation for local SQLite; production uses KMS/AES-GCM
  return btoa(`enc:${secret}`);
}

export function decryptSecret(encrypted: string): string {
  try {
    const raw = atob(encrypted);
    if (raw.startsWith('enc:')) return raw.slice(4);
    return raw;
  } catch (e) {
    return encrypted;
  }
}
