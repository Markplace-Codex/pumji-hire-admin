import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { existsSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const { DatabaseSync } = require('node:sqlite') as {
  DatabaseSync: new (path: string) => {
    exec: (sql: string) => void;
    prepare: (sql: string) => {
      get: (...params: unknown[]) => unknown;
      all: (...params: unknown[]) => unknown;
      run: (...params: unknown[]) => void;
    };
  };
};

const browserDistFolder = join(import.meta.dirname, '../browser');
const dbFolder = join(import.meta.dirname, '../db');
const dbPath = join(dbFolder, 'admin.sqlite');

if (!existsSync(dbFolder)) {
  mkdirSync(dbFolder, { recursive: true });
}

const database = new DatabaseSync(dbPath);
database.exec(`
  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    customer TEXT NOT NULL,
    status TEXT NOT NULL,
    amount REAL NOT NULL
  )
`);

const seedCount = database
  .prepare('SELECT COUNT(*) as total FROM orders')
  .get() as { total: number };
if (seedCount.total === 0) {
  const insertSeed = database.prepare(
    'INSERT INTO orders (id, customer, status, amount) VALUES (?, ?, ?, ?)',
  );
  insertSeed.run('#1001', 'Acme Corp', 'Processing', 2300);
  insertSeed.run('#1002', 'Globex', 'Completed', 1150);
}

const app = express();
const angularApp = new AngularNodeAppEngine();

app.use(express.json());

app.get('/api/orders', (_req, res) => {
  const rows = database
    .prepare('SELECT id, customer, status, amount FROM orders ORDER BY id DESC')
    .all() as Array<{ id: string; customer: string; status: string; amount: number }>;
  res.json(rows);
});

app.post('/api/orders', (req, res) => {
  const { id, customer, status, amount } = req.body as {
    id?: string;
    customer?: string;
    status?: string;
    amount?: number;
  };

  if (!id || !customer || !status || typeof amount !== 'number') {
    res.status(400).json({ message: 'Invalid order payload.' });
    return;
  }

  const exists = database
    .prepare('SELECT id FROM orders WHERE id = ?')
    .get(id) as { id: string } | undefined;

  if (exists) {
    res.status(409).json({ message: 'Order ID already exists.' });
    return;
  }

  database
    .prepare('INSERT INTO orders (id, customer, status, amount) VALUES (?, ?, ?, ?)')
    .run(id, customer, status, amount);

  res.status(201).json({ id, customer, status, amount });
});

app.put('/api/orders/:id', (req, res) => {
  const currentId = req.params['id'];
  const { id, customer, status, amount } = req.body as {
    id?: string;
    customer?: string;
    status?: string;
    amount?: number;
  };

  if (!id || !customer || !status || typeof amount !== 'number') {
    res.status(400).json({ message: 'Invalid order payload.' });
    return;
  }

  const target = database
    .prepare('SELECT id FROM orders WHERE id = ?')
    .get(currentId) as { id: string } | undefined;

  if (!target) {
    res.status(404).json({ message: 'Order not found.' });
    return;
  }

  if (currentId !== id) {
    const duplicate = database
      .prepare('SELECT id FROM orders WHERE id = ?')
      .get(id) as { id: string } | undefined;
    if (duplicate) {
      res.status(409).json({ message: 'Updated order ID already exists.' });
      return;
    }
  }

  database
    .prepare('UPDATE orders SET id = ?, customer = ?, status = ?, amount = ? WHERE id = ?')
    .run(id, customer, status, amount, currentId);

  res.json({ id, customer, status, amount });
});

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
