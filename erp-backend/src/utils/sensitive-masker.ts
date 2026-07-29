const SENSITIVE_KEYS = new Set([
  'password', 'pass', 'passwd', 'token', 'secret', 'jwt', 'otp', 'apikey', 'api_key', 
  'card_number', 'cardnumber', 'cvv', 'auth_token', 'refresh_token', 'private_key'
]);

export function maskSensitiveData(obj: any): any {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'string') {
    try {
      const parsed = JSON.parse(obj);
      if (typeof parsed === 'object' && parsed !== null) {
        return JSON.stringify(maskSensitiveData(parsed));
      }
    } catch (e) {}
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => maskSensitiveData(item));
  }

  if (typeof obj === 'object') {
    const masked: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      if (SENSITIVE_KEYS.has(lowerKey) || lowerKey.includes('password') || lowerKey.includes('secret') || lowerKey.includes('token')) {
        masked[key] = '********';
      } else if (typeof value === 'object' && value !== null) {
        masked[key] = maskSensitiveData(value);
      } else {
        masked[key] = value;
      }
    }
    return masked;
  }

  return obj;
}
