import { join, dirname } from 'path';
import { existsSync, mkdirSync } from 'fs';
import sqlite3 from 'sqlite3';

// Resolve DB path: prefer DATABASE_URL if given (file path), otherwise default under ./data/bonarr.db
function resolveDbPath() {
  const url = process.env.DATABASE_URL || '';
  // Determine filesystem path from env (raw path or file: URL) or default
  const p = url
    ? (url.startsWith('file:') ? url.slice('file:'.length) : url)
    : join(process.cwd(), 'data', 'bonarr.db');
  const dir = dirname(p);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return p;
}

const DB_PATH = resolveDbPath();

// Promisified wrapper
export class DB {
  private static _instance: DB;
  private db: sqlite3.Database;

  private constructor() {
    // Open DB with explicit flags and callback to surface open errors immediately
    const flags = sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE;
    this.db = new sqlite3.Database(DB_PATH, flags, (err) => {
      if (err) {
        // Log and rethrow to fail fast rather than emit uncaught 'error' later
        // eslint-disable-next-line no-console
        console.error('SQLite open error for', DB_PATH, err);
        throw err;
      }
    });
    this.init();
  }

  static instance(): DB {
    if (!DB._instance) DB._instance = new DB();
    return DB._instance;
  }

  private init() {
    this.db.serialize(() => {
      this.db.run(
        `CREATE TABLE IF NOT EXISTS torrents (
          hash TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          category TEXT DEFAULT '',
          added_on INTEGER NOT NULL,
          completion_on INTEGER NOT NULL DEFAULT 0,
          progress REAL NOT NULL DEFAULT 0,
          state TEXT NOT NULL DEFAULT 'downloading',
          save_path TEXT NOT NULL DEFAULT '',
          dlspeed INTEGER NOT NULL DEFAULT 0,
          upspeed INTEGER NOT NULL DEFAULT 0
        )`
      );
    });
  }

  run(sql: string, params: any[] = []): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function (err) {
        if (err) return reject(err);
        resolve();
      });
    });
  }

  get<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, function (err, row) {
        if (err) return reject(err);
        resolve(row as T | undefined);
      });
    });
  }

  all<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, function (err, rows) {
        if (err) return reject(err);
        resolve(rows as T[]);
      });
    });
  }
}

export type TorrentRow = {
  hash: string;
  name: string;
  category: string;
  added_on: number;
  completion_on: number;
  progress: number;
  state: string;
  save_path: string;
  dlspeed: number;
  upspeed: number;
};

export const TorrentsRepo = {
  async upsert(t: TorrentRow) {
    const db = DB.instance();
    await db.run(
      `INSERT INTO torrents (hash, name, category, added_on, completion_on, progress, state, save_path, dlspeed, upspeed)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(hash) DO UPDATE SET
         name=excluded.name,
         category=excluded.category,
         added_on=excluded.added_on,
         completion_on=excluded.completion_on,
         progress=excluded.progress,
         state=excluded.state,
         save_path=excluded.save_path,
         dlspeed=excluded.dlspeed,
         upspeed=excluded.upspeed
      `,
      [
        t.hash,
        t.name,
        t.category,
        t.added_on,
        t.completion_on,
        t.progress,
        t.state,
        t.save_path,
        t.dlspeed,
        t.upspeed,
      ]
    );
  },

  async list(): Promise<TorrentRow[]> {
    const db = DB.instance();
    return db.all<TorrentRow>(`SELECT * FROM torrents ORDER BY added_on DESC`);
  },

  async get(hash: string): Promise<TorrentRow | undefined> {
    const db = DB.instance();
    return db.get<TorrentRow>(`SELECT * FROM torrents WHERE hash = ?`, [hash]);
  },

  async deleteMany(hashes: string[]) {
    if (!hashes.length) return;
    const db = DB.instance();
    const placeholders = hashes.map(() => '?').join(',');
    await db.run(`DELETE FROM torrents WHERE hash IN (${placeholders})`, hashes);
  },
};
