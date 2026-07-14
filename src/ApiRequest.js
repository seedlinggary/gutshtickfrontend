const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000';

/** Like apiRequest, but never throws -- returns {ok, status, data} so callers
 * that need the full response body on a non-2xx (e.g. a structured
 * {error: '...'} detail) can read it, instead of apiRequest's thrown
 * `data.message` discarding everything else in the body. */
export async function apiRequestRaw(method, body, path) {
  const cookie = localStorage.getItem('cookie');
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-access-token': cookie,
    },
    body: method !== 'GET' ? JSON.stringify(body) : undefined,
  };

  const res = await fetch(`${API}${path}`, options);
  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json() : null;
  return { ok: res.ok, status: res.status, data };
}

async function apiRequest(method, body, path) {
  const { ok, status, data } = await apiRequestRaw(method, body, path);
  if (!ok) {
    throw (data && data.message) || status;
  }
  return data;
}

export default apiRequest;
