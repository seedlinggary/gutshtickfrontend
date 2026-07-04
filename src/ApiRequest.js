const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000';

async function apiRequest(method, body, path) {
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

  if (!res.ok) {
    throw (data && data.message) || res.status;
  }

  return data;
}

export default apiRequest;
