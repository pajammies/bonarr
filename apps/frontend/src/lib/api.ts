const explicit = import.meta.env.VITE_API_BASE_URL ?? '';
// Avoid using a baked-in localhost value from build-time .env in production
const shouldUseExplicit = explicit && !/^(https?:\/\/)?(localhost|127\.0\.0\.1)(:\d+)?$/i.test(explicit);
const baseURL = shouldUseExplicit ? explicit : (typeof window !== 'undefined' ? window.location.origin : '');

export async function api(path, init) {
  const url = `${baseURL}${path}`;
  const res = await fetch(url, { credentials: 'include', headers: { 'Content-Type': 'application/json', ...(init?.headers||{}) }, ...init });
  if (!res.ok) throw new Error('API ' + res.status + ': ' + await res.text());
  return res.json();
}
