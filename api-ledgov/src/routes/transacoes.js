// HTTP endpoints for the LEDGOV API.
// This layer validates requests and delegates business rules to the service.

'use strict';

const express = require('express');
const router = express.Router();
const service = require('../services/transacaoService');

function sendErrorResponse(res, err) {
  const statusCode = err.statusCode || 500;
  return res.status(statusCode).json({
    error: true,
    code: err.code || 'INTERNAL_ERROR',
    message: err.message,
    timestamp: new Date().toISOString(),
  });
}

router.post('/', async (req, res) => {
  const requestBody = req.body ?? {};
  const agency = requestBody.agency ?? requestBody.orgao;
  const supplier = requestBody.supplier ?? requestBody.fornecedor;
  const amount = requestBody.amount ?? requestBody.valor;
  const commitmentNumber = requestBody.commitmentNumber ?? requestBody.numEmpenho;
  const documentHash = requestBody.documentHash ?? requestBody.hashDocumento;
  const digitalSignature = requestBody.digitalSignature ?? requestBody.assinatura;

  const missingFields = [];
  if (!agency) missingFields.push('agency');
  if (!supplier) missingFields.push('supplier');
  if (!amount) missingFields.push('amount');
  if (!commitmentNumber) missingFields.push('commitmentNumber');

  if (missingFields.length > 0) {
    return res.status(400).json({
      error: true,
      code: 'REQUIRED_FIELDS_MISSING',
      message: `Missing required fields: ${missingFields.join(', ')}`,
      fields: missingFields,
    });
  }

  const numericAmount = parseFloat(amount);
  if (Number.isNaN(numericAmount) || numericAmount <= 0) {
    return res.status(400).json({
      error: true,
      code: 'INVALID_AMOUNT',
      message: 'The amount field must be a positive number',
    });
  }

  try {
    const transaction = await service.recordTransaction({
      agency,
      supplier,
      amount: numericAmount,
      commitmentNumber,
      documentHash,
      digitalSignature,
    });

    return res.status(201).json({
      success: true,
      message: 'Transaction recorded on the blockchain',
      data: transaction,
    });
  } catch (err) {
    return sendErrorResponse(res, err);
  }
});

router.get('/', async (req, res) => {
  try {
    const result = await service.listAllTransactions();
    return res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    return sendErrorResponse(res, err);
  }
});

router.get(['/agency/:agency', '/orgao/:agency'], async (req, res) => {
  const filters = {};

  const minAmount = req.query.minAmount ?? req.query.valorMin;
  const maxAmount = req.query.maxAmount ?? req.query.valorMax;

  if (minAmount) filters.minAmount = parseFloat(minAmount);
  if (maxAmount) filters.maxAmount = parseFloat(maxAmount);

  try {
    const result = await service.listTransactionsByAgency(
      decodeURIComponent(req.params.agency),
      filters
    );
    return res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    return sendErrorResponse(res, err);
  }
});

router.get('/:id', async (req, res) => {
  try {
    const transaction = await service.getTransaction(req.params.id);
    return res.json({
      success: true,
      data: transaction,
    });
  } catch (err) {
    return sendErrorResponse(res, err);
  }
});

module.exports = router;
