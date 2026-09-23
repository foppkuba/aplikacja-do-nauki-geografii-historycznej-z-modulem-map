import { readFile } from 'node:fs/promises';
import { pool } from '../server/db.js';

try {
  const client = await pool.connect();
  try {
    await client.query(await readFile(new URL('../database/progress.sql', import.meta.url), 'utf8'));
    console.log('Tabela postępów jest gotowa.');
  } finally { client.release(); }
} finally { await pool.end(); }
