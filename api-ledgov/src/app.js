// Central Express configuration for middleware and routes.

'use strict';

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const transactionRoutes = require('./routes/transacoes');

const app = express();

app.use(helmet());

app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://ledgov.gov.br']
    : '*',
  methods: ['GET', 'POST'],
}));

app.use(morgan('dev'));
app.use(express.json());

app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'LEDGOV API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

app.use(['/api/v1/transactions', '/api/v1/transacoes'], transactionRoutes);

app.use((req, res) => {
  res.status(404).json({
    error: true,
    code: 'ROUTE_NOT_FOUND',
    message: `Route ${req.method} ${req.path} does not exist`,
  });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: true,
    code: 'INTERNAL_ERROR',
    message: 'Internal server error',
  });
});

module.exports = app;
