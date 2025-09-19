import { FastifyInstance } from 'fastify';
import { TorrentsRepo, type TorrentRow } from '../db.js';
import { env } from '../env.js';

function nowSec() { return Math.floor(Date.now() / 1000); }

function base32ToHex(b32: string): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const c of b32.toUpperCase()) {
    const val = alphabet.indexOf(c);
    if (val === -1) throw new Error('Invalid base32');
    bits += val.toString(2).padStart(5, '0');
  }
  const nibs = bits.match(/.{1,4}/g) || [];
  let hex = '';
  for (const n of nibs) hex += parseInt(n.padEnd(4, '0'), 2).toString(16);
  return hex.replace(/0+$/, '').toUpperCase();
}

function normalizeInfoHashFromMagnet(magnet: string): string | null {
  const m = magnet.match(/xt=urn:btih:([^&]+)/i);
  if (!m) return null;
  const token = m[1];
  if (/^[0-9a-fA-F]{40}$/.test(token)) return token.toUpperCase();
  if (/^[A-Z2-7]{26,40}$/i.test(token)) return base32ToHex(token);
  return token.toUpperCase();
}

const categories: Record<string, { name: string; savePath: string }> = {};

export default async function qbittorrentRoutes(app: FastifyInstance) {
  // Auth: mimic qB endpoint. For MVP, accept credentials from env if set; else accept any.
  const USER = process.env.BONARR_AUTH_USER;
  const PASS = process.env.BONARR_AUTH_PASS;

  app.post('/api/v2/auth/login', async (req, reply) => {
    const body = (req as any).body || {};
    const username = body.username ?? body.user ?? body.login;
    const password = body.password ?? body.pass ?? body.pw;
    if (USER && PASS) {
      if (username !== USER || password !== PASS) {
        return reply.code(403).send('Fails.');
      }
    }
    return reply.send('Ok.');
  });

  app.get('/api/v2/app/version', async () => {
    return '4.6.5';
  });

  app.get('/api/v2/app/webapiVersion', async () => '2.8.20');

  // Preferences endpoint used by Sonarr/Radarr during connection tests
  app.get('/api/v2/app/preferences', async () => {
    // Return a minimal set of fields Sonarr/Radarr might inspect
    return {
      locale: 'en_US',
      save_path: '/data/bonarr',
      temp_path_enabled: false,
      auto_tmm_enabled: false,
      web_ui_address: '0.0.0.0',
      web_ui_port: Number(env.PORT) || 3001,
      create_subfolder_enabled: false,
      torrent_content_layout: 0,
    };
  });

  // Some clients call this; return a plausible default save path
  app.get('/api/v2/app/defaultSavePath', async () => '/data/bonarr');

  // Categories endpoints required by Sonarr/Radarr during tests
  app.get('/api/v2/torrents/categories', async () => {
    // Build map from in-memory categories, fall back to empty object
    const out: Record<string, { name: string; savePath: string }> = {};
    for (const [k, v] of Object.entries(categories)) out[k] = v;
    return out;
  });

  app.post('/api/v2/torrents/createCategory', async (req, reply) => {
    const body: any = (req as any).body || {};
    const name: string = body.category || body.name;
    const savePath: string = body.savePath || body.savepath || body.save_path || '/data/bonarr';
    if (!name) return reply.code(400).send({ error: 'category required' });
    categories[name] = { name, savePath };
    return reply.send('Ok.');
  });

  app.post('/api/v2/torrents/removeCategories', async (req) => {
    const body: any = (req as any).body || {};
    const names: string[] = (body.categories || body.category || '').split('|').filter(Boolean);
    for (const n of names) delete categories[n];
    return '';
  });

  // Transfer info (global speeds) endpoint
  app.get('/api/v2/transfer/info', async () => ({
    dl_info_speed: 0,
    dl_info_data: 0,
    up_info_speed: 0,
    up_info_data: 0,
    dht_nodes: 0,
    connection_status: 'connected',
  }));

  // Add torrent (magnet). Sonarr posts form-urlencoded with key "urls" containing the magnet.
  app.post('/api/v2/torrents/add', async (req, reply) => {
    const body: any = (req as any).body || {};
    const magnet: string | undefined = body.urls || body.magnet || body.url;
    if (!magnet) {
      return reply.code(400).send('Missing magnet in urls');
    }
    const hash = normalizeInfoHashFromMagnet(magnet) || 'RD_' + Buffer.from(magnet).toString('base64').slice(0, 32).toUpperCase();
    const name: string = body.rename || body.name || hash;
    const category: string = body.category || body.cat || '';
    const savePath: string = body.savepath || body.savePath || '';

    const t: TorrentRow = {
      hash,
      name,
      category,
      added_on: nowSec(),
      completion_on: 0,
      progress: 0,
      state: 'downloading',
      save_path: savePath,
      dlspeed: 0,
      upspeed: 0,
    };
    await TorrentsRepo.upsert(t);

    app.log.info({ hash, name, category }, 'qB add torrent (magnet)');
    return reply.send('Ok.');
  });

  // Return torrent list. Sonarr/Radarr call /torrents/info frequently.
  app.get('/api/v2/torrents/info', async (req, reply) => {
    const q: any = (req as any).query || {};
    const category: string | undefined = q.category || q.cat;
    let arr = await TorrentsRepo.list();
    if (category) arr = arr.filter(t => (t.category || '') === category);
    return reply.send(arr);
  });

  // Optional qB endpoint Sonarr sometimes uses for fast polling
  app.get('/api/v2/sync/maindata', async (req, reply) => {
    const list = await TorrentsRepo.list();
    const torrents: Record<string, any> = {};
    for (const t of list) {
      torrents[t.hash] = t;
    }
    return reply.send({ rid: Date.now(), full_update: true, torrents });
  });

  // Basic properties endpoint; qB usually uses `hash`, but be lenient.
  app.get('/api/v2/torrents/properties', async (req, reply) => {
    const q: any = (req as any).query || {};
    const single = q.hash as string | undefined;
    const hashesParam = (q.hashes as string | undefined) || (single ? single : undefined);
    if (!hashesParam) return reply.send([]);
    const hashes = hashesParam.split('|').filter(Boolean);
    const out: any[] = [];
    for (const h of hashes) {
      const t = await TorrentsRepo.get(h);
      if (!t) continue;
      out.push({ save_path: t.save_path, total_size: 0, creation_date: t.added_on, comment: '', piece_size: 0, pieces_have: 0, pieces_num: 0, dl_speed_avg: 0, dl_speed: t.dlspeed, up_speed: t.upspeed, priority: 0, state: t.state });
    }
    if (q.hash) return reply.send(out[0] || {});
    return reply.send(out);
  });

  // Pause/Resume no-ops for compatibility
  app.post('/api/v2/torrents/pause', async () => '');
  app.post('/api/v2/torrents/resume', async () => '');

  // Delete torrent(s)
  app.post('/api/v2/torrents/delete', async (req) => {
    const body: any = (req as any).body || {};
    const hashesStr: string = body.hashes || '';
    const hashes = hashesStr.split('|').filter(Boolean);
    await TorrentsRepo.deleteMany(hashes);
    return '';
  });
}
