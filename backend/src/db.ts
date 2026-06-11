import initSqlJs, { Database } from 'sql.js';
import path from 'path';
import fs from 'fs';

const DB_FILENAME = 'jiangjiao.db';
const DB_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DB_DIR, DB_FILENAME);

let db: Database | null = null;
let SQL: any = null;

export async function initDB(): Promise<Database> {
  if (db && SQL) return db as Database;

  SQL = await initSqlJs({
    locateFile: (file: string) =>
      path.join(__dirname, '..', 'node_modules', 'sql.js', 'dist', file),
  });

  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  createTables();
  saveDB();

  return db as Database;
}

function createTables() {
  if (!db) return;

  db.run(`
    CREATE TABLE IF NOT EXISTS cellars (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cellar_no TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'normal',
      last_turn_date TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS inspections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cellar_id INTEGER NOT NULL,
      cellar_no TEXT NOT NULL,
      opening INTEGER NOT NULL,
      smell TEXT NOT NULL,
      operator TEXT NOT NULL,
      change_reason TEXT,
      inspection_time TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (cellar_id) REFERENCES cellars(id)
    );
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_inspections_cellar_time 
    ON inspections(cellar_id, inspection_time DESC);
  `);
}

export function saveDB(): void {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

export function getDB(): Database {
  if (!db) {
    throw new Error('数据库未初始化，请先调用 initDB()');
  }
  return db;
}

export function query<T = any>(sql: string, params: any[] = []): T[] {
  const db = getDB();
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const results: T[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return results;
}

export function run(sql: string, params: any[] = []): {
  changes: number;
  lastInsertRowid: number;
} {
  const database = getDB();
  database.run(sql, params);
  saveDB();
  const result = database.exec(
    'SELECT last_insert_rowid() as id, changes() as changes'
  );
  const row = result[0]?.values?.[0];
  return {
    lastInsertRowid: Number(row?.[0] || 0),
    changes: Number(row?.[1] || 0),
  };
}

export function getOne<T = any>(sql: string, params: any[] = []): T | undefined {
  const results = query<T>(sql, params);
  return results[0];
}

export default getDB;
