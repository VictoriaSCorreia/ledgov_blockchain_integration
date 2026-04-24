// src/app.js
// Configuração central do Express — middlewares e rotas

'use strict';

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const rotasTransacoes = require('./routes/transacoes');

const app = express();

// ──────────────────────────────────────────────
// Middlewares de segurança e parsing
// ──────────────────────────────────────────────

// helmet: adiciona ~15 headers de segurança HTTP automaticamente
// (X-Frame-Options, X-Content-Type-Options, etc.)
app.use(helmet());

// cors: permite que o dashboard React (localhost:3001) acesse esta API (localhost:3000)
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://ledgov.gov.br']
    : '*',
  methods: ['GET', 'POST'],
}));

// morgan: log de cada request no terminal (método, URL, status, tempo)
// Exemplo: POST /api/v1/transacoes 201 342ms
app.use(morgan('dev'));

// express.json: parseia o body dos requests como JSON
app.use(express.json());

// ──────────────────────────────────────────────
// Rotas
// ──────────────────────────────────────────────

// Health check — sem autenticação, para monitoramento
app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'ok',
    servico: 'LEDGOV API',
    versao: '1.0.0',
    timestamp: new Date().toISOString(),
    ambiente: process.env.NODE_ENV,
  });
});

// Rotas de transações
app.use('/api/v1/transacoes', rotasTransacoes);

// ──────────────────────────────────────────────
// Handler de rota não encontrada (404)
// ──────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    erro: true,
    codigo: 'ROTA_NAO_ENCONTRADA',
    mensagem: `Rota ${req.method} ${req.path} não existe`,
  });
});

// ──────────────────────────────────────────────
// Handler global de erros (500)
// ──────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Erro não tratado:', err);
  res.status(500).json({
    erro: true,
    codigo: 'ERRO_INTERNO',
    mensagem: 'Erro interno do servidor',
  });
});

module.exports = app;