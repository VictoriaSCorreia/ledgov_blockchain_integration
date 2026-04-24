// src/routes/transacoes.js
// Endpoints HTTP da API LEDGOV
// Responsabilidade: receber request, validar formato, chamar service, retornar response

'use strict';

const express = require('express');
const router = express.Router();
const service = require('../services/transacaoService');

// ──────────────────────────────────────────────
// Helper: resposta de erro padronizada
// ──────────────────────────────────────────────
function erroResponse(res, err) {
  const statusCode = err.statusCode || 500;
  return res.status(statusCode).json({
    erro: true,
    codigo: err.code || 'ERRO_INTERNO',
    mensagem: err.message,
    timestamp: new Date().toISOString(),
  });
}

// ──────────────────────────────────────────────
// POST /api/v1/transacoes
// Registra uma nova transação na blockchain
// ──────────────────────────────────────────────
router.post('/', async (req, res) => {
  const { orgao, fornecedor, valor, numEmpenho, hashDocumento, assinatura } = req.body;

  // Validação de campos obrigatórios
  const camposFaltando = [];
  if (!orgao)       camposFaltando.push('orgao');
  if (!fornecedor)  camposFaltando.push('fornecedor');
  if (!valor)       camposFaltando.push('valor');
  if (!numEmpenho)  camposFaltando.push('numEmpenho');

  if (camposFaltando.length > 0) {
    return res.status(400).json({
      erro: true,
      codigo: 'CAMPOS_OBRIGATORIOS',
      mensagem: `Campos obrigatórios ausentes: ${camposFaltando.join(', ')}`,
      campos: camposFaltando,
    });
  }

  // Validação de tipos
  const valorNumerico = parseFloat(valor);
  if (isNaN(valorNumerico) || valorNumerico <= 0) {
    return res.status(400).json({
      erro: true,
      codigo: 'VALOR_INVALIDO',
      mensagem: 'O campo valor deve ser um número positivo',
    });
  }

  try {
    const transacao = await service.registrarTransacao({
      orgao,
      fornecedor,
      valor: valorNumerico,
      numEmpenho,
      hashDocumento,
      assinatura,
    });

    // 201 Created — recurso criado com sucesso
    return res.status(201).json({
      sucesso: true,
      mensagem: 'Transação registrada na blockchain com sucesso',
      dados: transacao,
    });

  } catch (err) {
    return erroResponse(res, err);
  }
});

// ──────────────────────────────────────────────
// GET /api/v1/transacoes
// Lista todas as transações (dashboard público)
// ──────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const resultado = await service.listarTodasTransacoes();
    return res.json({
      sucesso: true,
      ...resultado,
    });
  } catch (err) {
    return erroResponse(res, err);
  }
});

// ──────────────────────────────────────────────
// GET /api/v1/transacoes/orgao/:orgao
// Lista o histórico de transações de um órgão
// ──────────────────────────────────────────────
router.get('/orgao/:orgao', async (req, res) => {
  const filtros = {};

  // Filtros opcionais via query string:
  // ?valorMin=1000&valorMax=50000
  if (req.query.valorMin) filtros.valorMin = parseFloat(req.query.valorMin);
  if (req.query.valorMax) filtros.valorMax = parseFloat(req.query.valorMax);

  try {
    const resultado = await service.listarPorOrgao(
      decodeURIComponent(req.params.orgao),
      filtros
    );
    return res.json({
      sucesso: true,
      ...resultado,
    });
  } catch (err) {
    return erroResponse(res, err);
  }
});

// ──────────────────────────────────────────────
// GET /api/v1/transacoes/:id
// Busca uma transação específica pelo ID
// ──────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const transacao = await service.consultarTransacao(req.params.id);
    return res.json({
      sucesso: true,
      dados: transacao,
    });
  } catch (err) {
    return erroResponse(res, err);
  }
});

module.exports = router;
