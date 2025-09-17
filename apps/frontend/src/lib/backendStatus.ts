import { writable } from 'svelte/store';
import { api } from './api';
export const backendStatus = writable('checking');
export const backendMessage = writable('Checking backend...');
export async function checkBackend(){ backendStatus.set('checking'); backendMessage.set('Checking backend...'); try{ const res = await api('/api/health'); if(res?.status==='ok'){ backendStatus.set('online'); backendMessage.set('Backend online'); } else { backendStatus.set('offline'); backendMessage.set('Backend returned unexpected response'); } } catch { backendStatus.set('offline'); backendMessage.set('Backend offline'); } }
