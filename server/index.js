import { app } from './app.js';
import { pool } from './db.js';

const port = Number(process.env.PORT || 3000);

const server = app.listen(port, () => {
  console.log(`API działa pod adresem http://localhost:${port}`);
});

const shutdown = async () => {
  server.close();
  await pool.end();
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
