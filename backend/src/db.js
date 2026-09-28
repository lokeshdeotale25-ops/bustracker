import sqlite3 from 'sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const schemaPath = path.join(__dirname, '..', '..', 'database', 'schema.sql');
const dataDir = path.join(__dirname, '..', 'data');
const dbPath = path.join(dataDir, 'college_bus_tracking.db');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath);

export const run = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function (err) {
    if (err) return reject(err);
    resolve({ id: this.lastID, changes: this.changes });
  });
});

export const exec = (sql) => new Promise((resolve, reject) => {
  db.exec(sql, (err) => {
    if (err) return reject(err);
    resolve();
  });
});

export const get = (sql, params = []) => new Promise((resolve, reject) => {
  db.get(sql, params, (err, row) => {
    if (err) return reject(err);
    resolve(row);
  });
});

export const all = (sql, params = []) => new Promise((resolve, reject) => {
  db.all(sql, params, (err, rows) => {
    if (err) return reject(err);
    resolve(rows);
  });
});

export const initDatabase = async () => {
  const schema = fs.readFileSync(schemaPath, 'utf8');
  await exec(schema);
};

export default db;
