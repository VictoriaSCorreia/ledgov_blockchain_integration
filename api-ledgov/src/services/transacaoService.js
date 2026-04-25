// src/services/transacaoService.js
// Transaction business rules with no HTTP concerns.
// This layer is unit-testable without a running Fabric network.

'use strict';

const { invokeChaincode, evaluateChaincode } = require('../fabric/gateway');
const crypto = require('node:crypto');

function generateTransactionId() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `TRX-${timestamp}-${randomSuffix}`;
}

function generateDocumentHash(payload) {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(payload))
    .digest('hex');
}

function normalizeTransactionRecord(record = {}) {
  const rawAmount = record.amount ?? record.valor ?? 0;

  return {
    id: record.id,
    agency: record.agency ?? record.orgao ?? '',
    supplier: record.supplier ?? record.fornecedor ?? '',
    amount: Number(rawAmount),
    commitmentNumber: record.commitmentNumber ?? record.numEmpenho ?? record.num_empenho ?? '',
    documentHash: record.documentHash ?? record.hashDocumento ?? record.hash_documento ?? '',
    digitalSignature: record.digitalSignature ?? record.assinatura ?? record.descricao ?? '',
    timestamp: record.timestamp ?? '',
  };
}

class TransactionAlreadyExistsError extends Error {
  constructor(id) {
    super(`Transaction ${id} already exists on the blockchain`);
    this.code = 'TRANSACTION_ALREADY_EXISTS';
    this.statusCode = 409;
  }
}

class TransactionNotFoundError extends Error {
  constructor(id) {
    super(`Transaction ${id} was not found`);
    this.code = 'TRANSACTION_NOT_FOUND';
    this.statusCode = 404;
  }
}

class BlockchainError extends Error {
  constructor(message) {
    super(`Blockchain error: ${message}`);
    this.code = 'BLOCKCHAIN_ERROR';
    this.statusCode = 500;
  }
}

/**
 * Records a new government transaction on the blockchain.
 *
 * @param {Object} transactionData - Transaction data
 * @param {string} transactionData.agency - Government agency name
 * @param {string} transactionData.supplier - Supplier name or identifier
 * @param {number} transactionData.amount - Amount in BRL
 * @param {string} transactionData.commitmentNumber - Commitment number
 * @param {string} [transactionData.documentHash] - Optional SHA-256 document hash
 * @param {string} [transactionData.digitalSignature] - Optional signature used by the prototype
 * @returns {Object} Recorded transaction with a generated ID
 */
async function recordTransaction(transactionData) {
  const id = generateTransactionId();
  const documentHash = transactionData.documentHash || generateDocumentHash(transactionData);
  const digitalSignature = transactionData.digitalSignature || `SIM-${id}`;

  try {
    await invokeChaincode(
      'RecordTransaction',
      id,
      transactionData.agency,
      transactionData.supplier,
      String(transactionData.amount),
      transactionData.commitmentNumber,
      documentHash,
      digitalSignature
    );

    return {
      id,
      ...transactionData,
      documentHash,
      digitalSignature,
      status: 'RECORDED',
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    if (err.message?.includes('already recorded') || err.message?.includes('já registrada')) {
      throw new TransactionAlreadyExistsError(id);
    }
    if (err.message?.includes('BLOCKED') || err.message?.includes('BLOQUEADO')) {
      const blockedError = new Error(err.message);
      blockedError.code = 'SMART_CONTRACT_BLOCKED';
      blockedError.statusCode = 422;
      throw blockedError;
    }
    throw new BlockchainError(err.message);
  }
}

/**
 * Returns one transaction by ID.
 *
 * @param {string} id - Transaction ID
 * @returns {Object} Full transaction payload
 */
async function getTransaction(id) {
  try {
    const result = await evaluateChaincode('GetTransaction', id);
    return normalizeTransactionRecord(result);
  } catch (err) {
    if (
      err.message?.includes('not found') ||
      err.message?.includes('não encontrada') ||
      err.message?.includes('does not exist')
    ) {
      throw new TransactionNotFoundError(id);
    }
    throw new BlockchainError(err.message);
  }
}

/**
 * Lists transactions for one agency.
 *
 * @param {string} agency - Agency name
 * @param {Object} [filters] - Optional amount filters
 * @param {number} [filters.minAmount] - Minimum amount
 * @param {number} [filters.maxAmount] - Maximum amount
 * @returns {Array} Filtered transaction list
 */
async function listTransactionsByAgency(agency, filters = {}) {
  try {
    const result = await evaluateChaincode('ListAllTransactions');

    let transactions = Array.isArray(result) ? result.map(normalizeTransactionRecord) : [];
    transactions = transactions.filter((transaction) => transaction.agency === agency);

    if (filters.minAmount !== undefined) {
      transactions = transactions.filter((transaction) => transaction.amount >= filters.minAmount);
    }
    if (filters.maxAmount !== undefined) {
      transactions = transactions.filter((transaction) => transaction.amount <= filters.maxAmount);
    }

    return {
      agency,
      total: transactions.length,
      transactions,
    };
  } catch (err) {
    throw new BlockchainError(err.message);
  }
}

/**
 * Lists every transaction for the public dashboard.
 */
async function listAllTransactions() {
  try {
    const result = await evaluateChaincode('ListAllTransactions');
    const transactions = Array.isArray(result) ? result.map(normalizeTransactionRecord) : [];

    return {
      total: transactions.length,
      transactions,
    };
  } catch (err) {
    throw new BlockchainError(err.message);
  }
}

module.exports = {
  recordTransaction,
  getTransaction,
  listTransactionsByAgency,
  listAllTransactions,
  TransactionNotFoundError,
  TransactionAlreadyExistsError,
  BlockchainError,
};
