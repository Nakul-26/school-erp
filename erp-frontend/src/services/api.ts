export const BASE_URL = import.meta.env.VITE_API_URL || '';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|; )erp_csrf=([^;]*)/);
  return match && match[1] !== undefined ? decodeURIComponent(match[1]) : null;
}

function buildHeaders(method: string, extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { Accept: 'application/json', ...extra };
  if (MUTATING_METHODS.has(method.toUpperCase())) {
    const csrf = getCsrfToken();
    if (csrf) headers['X-CSRF-Token'] = csrf;
  }
  return headers;
}

async function parseResponse<T = any>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (typeof window !== 'undefined') {
      if (res.status === 401) {
        localStorage.removeItem('erp_user');
        if (!window.location.pathname.startsWith('/login')) {
          window.location.href = '/login';
        }
      }
    }
    throw new Error(data.error || 'Request failed');
  }
  return data;
}

// Session lives in an httpOnly cookie set by the backend; `credentials: 'include'`
// is required so the browser attaches it (frontend/backend run on different
// ports in dev and are cross-origin, even though same-site).
export const api = {
  get: async <T = any>(path: string): Promise<T> => {
    const res = await fetch(`${BASE_URL}${path}`, {
      credentials: 'include',
      headers: buildHeaders('GET'),
    });
    return parseResponse<T>(res);
  },
  post: async <T = any>(path: string, body: any): Promise<T> => {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      credentials: 'include',
      headers: buildHeaders('POST', { 'Content-Type': 'application/json' }),
      body: JSON.stringify(body),
    });
    return parseResponse<T>(res);
  },
  put: async <T = any>(path: string, body: any): Promise<T> => {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'PUT',
      credentials: 'include',
      headers: buildHeaders('PUT', { 'Content-Type': 'application/json' }),
      body: JSON.stringify(body),
    });
    return parseResponse<T>(res);
  },
  patch: async <T = any>(path: string, body: any): Promise<T> => {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: buildHeaders('PATCH', { 'Content-Type': 'application/json' }),
      body: JSON.stringify(body),
    });
    return parseResponse<T>(res);
  },
  delete: async <T = any>(path: string, body?: any): Promise<T> => {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: buildHeaders('DELETE', body ? { 'Content-Type': 'application/json' } : undefined),
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return parseResponse<T>(res);
  },
  upload: async <T = any>(path: string, formData: FormData): Promise<T> => {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      credentials: 'include',
      headers: buildHeaders('POST'),
      body: formData,
    });
    return parseResponse<T>(res);
  }
};

// Fetch wrapper for pages that need direct access to the Response object
// (streaming blobs, custom status handling) instead of the parsed-JSON `api.*`
// helpers above. Applies the same cookie + CSRF conventions.
export async function authFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const method = (options.method || 'GET').toUpperCase();
  return fetch(`${BASE_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: { ...buildHeaders(method), ...(options.headers as Record<string, string> | undefined) },
  });
}

export function getAuthenticatedUrl(path: string): string {
  if (!path) return '';
  if (path.startsWith('data:')) return path;
  // Session cookie is attached automatically by the browser for same-site
  // requests (including plain <img>/<a> loads) - no token needed in the URL.
  return path.startsWith('http') ? path : `${BASE_URL}${path}`;
}
