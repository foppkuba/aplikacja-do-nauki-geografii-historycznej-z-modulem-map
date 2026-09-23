import { writeFile } from 'node:fs/promises';
import { pool } from '../server/db.js';
import { readSnapshot } from './event-snapshot.mjs';

try {
  const snapshot = await readSnapshot(pool);
  await writeFile(new URL('../database/events.snapshot.json', import.meta.url),
    JSON.stringify(snapshot, null, 2) + '\n', { encoding: 'utf8', flag: 'wx' });
  console.log(`Zapisano ${snapshot.events.length} wydarzeń w database/events.snapshot.json.`);
} finally {
  await pool.end();
}
