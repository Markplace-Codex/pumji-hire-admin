import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { createRequire } from 'node:module';
import { join } from 'node:path';

const require = createRequire(import.meta.url);

const browserDistFolder = join(import.meta.dirname, '../browser');
const sqlConnectionString =
  process.env['CUSTOMER_DB_CONNECTION'] ??
  'Server=164.52.220.35,1433;Initial Catalog=SuperAdminBlockDB;User Id=SA;Password=G54Er59#12345aBcDe;Encrypt=false;TrustServerCertificate=True;';

type SqlRequest = {
  input: (name: string, value: unknown) => SqlRequest;
  query: (sql: string) => Promise<{ recordset: unknown[] }>;
};

type SqlPool = {
  request: () => SqlRequest;
};

type MssqlModule = {
  connect: (connectionString: string) => Promise<SqlPool>;
};

let poolPromise: Promise<SqlPool> | undefined;

async function getSqlPool(): Promise<SqlPool> {
  if (!poolPromise) {
    const mssql = require('mssql') as MssqlModule;
    poolPromise = mssql.connect(sqlConnectionString);
  }

  return poolPromise;
}

const app = express();
const angularApp = new AngularNodeAppEngine();

app.use(express.json());

app.get('/api/orders', async (_req, res) => {
  try {
    const pool = await getSqlPool();
    const result = await pool.request().query(`
      SELECT Id AS id, Customer AS customer, Status AS status, CAST(Amount AS float) AS amount
      FROM dbo.Orders
      ORDER BY UpdatedAt DESC
    `);

    res.json(result.recordset);
  } catch (error) {
    console.error('Failed to load orders from SQL Server:', error);
    res.status(500).json({ message: 'Failed to load orders from SQL Server.' });
  }
});

app.post('/api/orders', async (req, res) => {
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

  try {
    const pool = await getSqlPool();
    const existing = await pool
      .request()
      .input('id', id)
      .query('SELECT Id FROM dbo.Orders WHERE Id = @id');

    if (existing.recordset.length > 0) {
      res.status(409).json({ message: 'Order ID already exists.' });
      return;
    }

    await pool
      .request()
      .input('id', id)
      .input('customer', customer)
      .input('status', status)
      .input('amount', amount)
      .query(`
        INSERT INTO dbo.Orders (Id, Customer, Status, Amount, UpdatedAt)
        VALUES (@id, @customer, @status, @amount, SYSUTCDATETIME())
      `);

    res.status(201).json({ id, customer, status, amount });
  } catch (error) {
    console.error('Failed to create order in SQL Server:', error);
    res.status(500).json({ message: 'Failed to create order in SQL Server.' });
  }
});

app.put('/api/orders/:id', async (req, res) => {
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

  try {
    const pool = await getSqlPool();
    const target = await pool
      .request()
      .input('currentId', currentId)
      .query('SELECT Id FROM dbo.Orders WHERE Id = @currentId');

    if (target.recordset.length === 0) {
      res.status(404).json({ message: 'Order not found.' });
      return;
    }

    if (currentId !== id) {
      const duplicate = await pool
        .request()
        .input('id', id)
        .query('SELECT Id FROM dbo.Orders WHERE Id = @id');

      if (duplicate.recordset.length > 0) {
        res.status(409).json({ message: 'Updated order ID already exists.' });
        return;
      }
    }

    await pool
      .request()
      .input('currentId', currentId)
      .input('id', id)
      .input('customer', customer)
      .input('status', status)
      .input('amount', amount)
      .query(`
        UPDATE dbo.Orders
        SET Id = @id,
            Customer = @customer,
            Status = @status,
            Amount = @amount,
            UpdatedAt = SYSUTCDATETIME()
        WHERE Id = @currentId
      `);

    res.json({ id, customer, status, amount });
  } catch (error) {
    console.error('Failed to update order in SQL Server:', error);
    res.status(500).json({ message: 'Failed to update order in SQL Server.' });
  }
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
