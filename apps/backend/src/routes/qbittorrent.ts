import { FastifyInstance } from 'fastify';

// Minimal in-memory store for "torrents" (really RD transfers later)
type Torrent = {
  hash: string; // what Sonarr/Radarr identify by (infohash or derived)
  name: string;
  added_on: number; // seconds
  completion_on: number; // seconds
  progress: number; // 0..1
  state: string; // qB-style state
  save_path: string;
  dlspeed: number;
  upspeed: number;
};

const mem: Record<string, Torrent> = {};

function nowSec() { return Math.floor(Date.now() / 1000); }

function extractInfoHash(magnet: string): string | null {
  // Try btih as hex or base32
  const m = magnet.match(/xt=urn:btih:([^&]+)/i);
  if (!m) return null;
  const v = m[1];
  // qB reports uppercase hex usually; for Sonarr/Radarr matching, uppercase is fine
  return v.toUpperCase();
}

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
    // qB returns 200 OK and sets a cookie, but Sonarr/Radarr don't require it strictly.
    // We'll just reply OK.
    return reply.send('Ok.');
  });

  app.get('/api/v2/app/version', async () => {
    // Return any plausible qB version string
    return '4.5.0';
  });

  // Add torrent (magnet). Sonarr posts form-urlencoded with key "urls" containing the magnet.
  app.post('/api/v2/torrents/add', async (req, reply) => {
    const body: any = (req as any).body || {};
    const magnet: string | undefined = body.urls || body.magnet || body.url;
    if (!magnet) {
      return reply.code(400).send('Missing magnet in urls');
    }
    const hash = extractInfoHash(magnet) || 'RD_' + Buffer.from(magnet).toString('base64').slice(0, 32).toUpperCase();
    const name: string = body.rename || body.name || hash;
    const savePath: string = body.savepath || body.savePath || '';

    // Insert into memory as a placeholder; state will be updated by future RD poller.
    const t: Torrent = {
      hash,
      name,
      added_on: nowSec(),
      completion_on: 0,
      progress: 0,
      state: 'downloading',
      save_path: savePath,
      dlspeed: 0,
      upspeed: 0,
    };
    mem[hash] = t;

    // For developer convenience, log the magnet/hash
    app.log.info({ hash, name }, 'qB add torrent (magnet)');
    return reply.send('Ok.');
  });

  // Return torrent list. Sonarr/Radarr call /torrents/info frequently.
  app.get('/api/v2/torrents/info', async (req, reply) => {
    // qB returns an array of torrent objects
    const arr = Object.values(mem);
    return reply.send(arr);
  });

  // Optional qB endpoint Sonarr sometimes uses for fast polling
  app.get('/api/v2/sync/maindata', async (req, reply) => {
    // Minimal maindata. qB returns an object with full_state, torrents, rid, etc.
    // We'll return only what Sonarr uses: torrents keyed by hash.
    const torrents: Record<string, any> = {};
    for (const t of Object.values(mem)) {
      torrents[t.hash] = t;
    }
    return reply.send({ rid: Date.now(), full_update: true, torrents });
  });

  // Pause/Resume no-ops for compatibility
  app.post('/api/v2/torrents/pause', async () => '');
  app.post('/api/v2/torrents/resume', async () => '');

  // Delete torrent(s)
  app.post('/api/v2/torrents/delete', async (req) => {
    const body: any = (req as any).body || {};
    const hashesStr: string = body.hashes || '';
    const hashes = hashesStr.split('|').filter(Boolean);
    for (const h of hashes) delete mem[h];
    return '';
  });
}
