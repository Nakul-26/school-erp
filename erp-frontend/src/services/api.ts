const BASE_URL = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'http://localhost:8787' : '');

async function parseResponse(res: Response) {
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

const getHeaders = () => {
  const token = localStorage.getItem('erp_token');
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
};

export const api = {
  get: async (path: string) => {
    const res = await fetch(`${BASE_URL}${path}`, { headers: getHeaders() });
    return parseResponse(res);
  },
  post: async (path: string, body: any) => {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(body),
    });
    return parseResponse(res);
  },
  put: async (path: string, body: any) => {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(body),
    });
    return parseResponse(res);
  },
  delete: async (path: string) => {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return parseResponse(res);
  },
  upload: async (path: string, formData: FormData) => {
    const token = localStorage.getItem('erp_token');
    const headers: Record<string, string> = {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    };
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers,
      body: formData
    });
    return parseResponse(res);
  }
};
