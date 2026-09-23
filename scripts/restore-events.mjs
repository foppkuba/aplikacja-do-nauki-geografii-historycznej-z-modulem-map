import { readFile } from 'node:fs/promises';
import { pool } from '../server/db.js';
import { restoreSnapshot } from './event-snapshot.mjs';

const client = await pool.connect();
try {
  const snapshot = JSON.parse(await readFile(new URL('../database/events.snapshot.json', import.meta.url), 'utf8'));
  await client.query('BEGIN');
  await restoreSnapshot(client, snapshot);
  await client.query('COMMIT');
  console.log(`Odtworzono ${snapshot.events.length} wydarzeń z lokalnego eksportu.`);
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
  await pool.end();
}
