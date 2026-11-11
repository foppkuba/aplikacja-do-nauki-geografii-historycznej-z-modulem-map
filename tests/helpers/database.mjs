import dotenv from 'dotenv';
import pg from 'pg';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { restoreSnapshot } from '../../scripts/event-snapshot.mjs';

// Ten plik przygotowuje bazę i serwer dla testów z api.test.mjs.
// Każde uruchomienie otrzymuje osobny schemat z losową nazwą.
export async function createTestEnvironment() {
  if (!process.env.TEST_DATABASE_URL && !process.env.DATABASE_URL) {
    dotenv.config({ quiet: true });
  }

  const connectionString = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      'Ustaw TEST_DATABASE_URL lub DATABASE_URL. Testy wymagają PostgreSQL i uprawnienia CREATE SCHEMA.',
    );
  }

  const schemaName = `chronomap_test_${randomUUID().replaceAll('-', '')}`;
  const databaseClient = new pg.Client({
    connectionString,
    connectionTimeoutMillis: 5000,
    ssl: process.env.DATABASE_SSL === 'true'
      ? { rejectUnauthorized: false }
      : undefined,
  });

  let applicationPool;
  let server;
  let schemaCreated = false;

  async function cleanup() {
    // Każdy finally pozwala wykonać dalsze sprzątanie, nawet po wcześniejszym błędzie.
    try {
      if (server) {
        await closeServer(server);
      }
    } finally {
      try {
        if (applicationPool) {
          await applicationPool.end();
        }
      } finally {
        try {
          // Usuwamy wyłącznie schemat utworzony przez to uruchomienie.
          const isTestSchema = /^chronomap_test_[0-9a-f]{32}$/.test(schemaName);
          if (schemaCreated && isTestSchema) {
            await databaseClient.query(`DROP SCHEMA "${schemaName}" CASCADE`);
          }
        } finally {
          await databaseClient.end();
        }
      }
    }
  }

  try {
    // 1. Tworzymy osobny schemat i kierujemy do niego zapytania.
    await databaseClient.connect();
    await databaseClient.query(`CREATE SCHEMA "${schemaName}"`);
    schemaCreated = true;
    await databaseClient.query(`SET search_path TO "${schemaName}"`);

    // 2. Przygotowujemy tabele oraz dane wymagane przez API.
    const sqlFiles = [
      'schema.sql',
      'quizzes.sql',
      'countries.sql',
      'war-alignments.sql',
      'progress.sql',
    ];

    for (const fileName of sqlFiles) {
      const fileUrl = new URL(`../../database/${fileName}`, import.meta.url);
      const sql = await readFile(fileUrl, 'utf8');
      await databaseClient.query(sql);
    }

    const snapshotUrl = new URL('../../database/events.snapshot.json', import.meta.url);
    const snapshotText = await readFile(snapshotUrl, 'utf8');
    const snapshot = JSON.parse(snapshotText);

    await databaseClient.query('BEGIN');
    try {
      await restoreSnapshot(databaseClient, snapshot);
      await databaseClient.query('COMMIT');
    } catch (error) {
      await databaseClient.query('ROLLBACK');
      throw error;
    }

    // 3. Ustawiamy połączenie API przed importem jego modułów.
    // Zmiana dotyczy tylko procesu testowego; plik .env pozostaje bez zmian.
    const testConnection = new URL(connectionString);
    testConnection.searchParams.set('options', `-c search_path=${schemaName}`);
    process.env.DATABASE_URL = testConnection.toString();
    process.env.DOTENV_CONFIG_PATH = fileURLToPath(new URL('./test.env', import.meta.url));

    const databaseModule = await import('../../server/db.js');
    applicationPool = databaseModule.pool;
    const { app } = await import('../../server/app.js');

    // 4. Port 0 oznacza: system sam wybierze wolny port.
    server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');

    const baseUrl = `http://127.0.0.1:${server.address().port}`;
    const request = createApiRequest(baseUrl);
    const versionResult = await databaseClient.query('SHOW server_version');

    return {
      request,
      pool: applicationPool,
      admin: databaseClient,
      cleanup,
      schema: schemaName,
      databaseVersion: versionResult.rows[0].server_version,
    };
  } catch (error) {
    await cleanup();
    throw error;
  }
}

// Zamiast powtarzać fetch i składanie nagłówków w każdym scenariuszu,
// test przekazuje tylko ścieżkę, dane i ewentualne ciasteczko sesji.
function createApiRequest(baseUrl) {
  return function request(path, options = {}) {
    const {
      body,
      cookie,
      method = body === undefined ? 'GET' : 'POST',
      headers = {},
      raw,
    } = options;

    const requestHeaders = {};
    if (body !== undefined || raw !== undefined) {
      requestHeaders['Content-Type'] = 'application/json';
    }
    if (cookie) {
      requestHeaders.Cookie = cookie;
    }
    Object.assign(requestHeaders, headers);

    const requestOptions = {
      method,
      headers: requestHeaders,
      signal: AbortSignal.timeout(10000),
    };

    // raw służy między innymi do testowania celowo uszkodzonego JSON-a.
    if (raw !== undefined) {
      requestOptions.body = raw;
    } else if (body !== undefined) {
      requestOptions.body = JSON.stringify(body);
    }

    return fetch(baseUrl + path, requestOptions);
  };
}

function closeServer(server) {
  return new Promise((resolve, reject) => {
    server.close(error => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}
