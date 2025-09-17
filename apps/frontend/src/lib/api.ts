const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
export async function api(path, init) {
  const res = await fetch(`${baseURL}${path}`, { credentials: 'include', headers: { 'Content-Type': 'application/json', ...(init?.headers||{}) }, ...init });
  if (!res.ok) throw new Error('API ' + res.status + ': ' + await res.text());
  return res.json();
}
