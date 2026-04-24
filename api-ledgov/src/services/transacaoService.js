// src/services/transacaoService.js
// Lógica de negócio das transações — sem saber nada de HTTP ou blockchain
// Essa camada pode ser testada unitariamente sem subir a rede

'use strict';

const { invocarChaincode, consultarChaincode } = require('../fabric/gateway');
const crypto = require('node:crypto');

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

// Gera um ID único para a transação
// Formato: TRX-{timestamp}-{random} — rastreável e único
function gerarIdTransacao() {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `TRX-${ts}-${rand}`;
}

// Gera hash SHA-256 do objeto documento (simula hash de nota fiscal)
// Em produção: recebe o hash real do documento já calculado pelo cliente
function gerarHashDocumento(dados) {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(dados))
    .digest('hex');
}

// ──────────────────────────────────────────────
// Erros de domínio específicos
// ──────────────────────────────────────────────

class TransacaoJaExisteError extends Error {
  constructor(id) {
    super(`Transação ${id} já existe na blockchain`);
    this.code = 'TRANSACAO_JA_EXISTE';
    this.statusCode = 409;
  }
}

class TransacaoNaoEncontradaError extends Error {
  constructor(id) {
    super(`Transação ${id} não encontrada`);
    this.code = 'TRANSACAO_NAO_ENCONTRADA';
    this.statusCode = 404;
  }
}

class BlockchainError extends Error {
  constructor(mensagem) {
    super(`Erro na blockchain: ${mensagem}`);
    this.code = 'BLOCKCHAIN_ERROR';
    this.statusCode = 500;
  }
}

// ──────────────────────────────────────────────
// Funções do serviço
// ──────────────────────────────────────────────

/**
 * Registra uma nova transação governamental na blockchain.
 *
 * @param {Object} dados - Dados da transação
 * @param {string} dados.orgao - Nome do órgão (ex: "Secretaria de Educação")
 * @param {string} dados.fornecedor - CNPJ/Nome do fornecedor
 * @param {number} dados.valor - Valor em reais
 * @param {string} dados.numEmpenho - Número do empenho orçamentário
 * @param {string} [dados.hashDocumento] - Hash SHA-256 da NF (opcional: gerado se ausente)
 * @param {string} [dados.assinatura] - Assinatura digital ICP-Brasil (opcional no protótipo)
 * @returns {Object} Transação registrada com ID gerado
 */
async function registrarTransacao(dados) {
  const id = gerarIdTransacao();
  const hashDoc = dados.hashDocumento || gerarHashDocumento(dados);
  const assinatura = dados.assinatura || `SIM-${id}`; // Simplificado no protótipo

  try {
    const resultado = await invocarChaincode(
      'RegistrarTransacao',
      id,
      dados.orgao,
      dados.fornecedor,
      String(dados.valor),   // chaincode recebe strings
      dados.numEmpenho,
      hashDoc,
      assinatura
    );

    return {
      id,
      ...dados,
      hashDocumento: hashDoc,
      status: 'REGISTRADO',
      timestamp: new Date().toISOString(),
    };

  } catch (err) {
    // Mapear erros do chaincode para erros de domínio
    if (err.message?.includes('já registrada')) {
      throw new TransacaoJaExisteError(id);
    }
    if (err.message?.includes('BLOQUEADO')) {
      // Repassar mensagem do smart contract diretamente — ela é informativa
      const e = new Error(err.message);
      e.code = 'SMART_CONTRACT_BLOQUEIO';
      e.statusCode = 422;
      throw e;
    }
    throw new BlockchainError(err.message);
  }
}

/**
 * Consulta uma transação específica pelo ID.
 *
 * @param {string} id - ID da transação (ex: TRX-ABC123-DEF456)
 * @returns {Object} Dados completos da transação
 */
async function consultarTransacao(id) {
  try {
    const resultado = await consultarChaincode('ConsultarTransacao', id);
    return resultado;
  } catch (err) {
    if (err.message?.includes('não encontrada') || err.message?.includes('does not exist')) {
      throw new TransacaoNaoEncontradaError(id);
    }
    throw new BlockchainError(err.message);
  }
}

/**
 * Lista todas as transações de um órgão específico.
 *
 * @param {string} orgao - Nome do órgão
 * @param {Object} [filtros] - Filtros opcionais
 * @param {number} [filtros.valorMin] - Valor mínimo
 * @param {number} [filtros.valorMax] - Valor máximo
 * @returns {Array} Lista de transações
 */
async function listarPorOrgao(orgao, filtros = {}) {
  try {
    const resultado = await consultarChaincode('ListarTodasTransacoes');

    // O contrato atual só expõe a listagem completa; o filtro por órgão fica na API.
    let transacoes = Array.isArray(resultado) ? resultado : [];
    transacoes = transacoes.filter((t) => t.orgao === orgao);

    if (filtros.valorMin !== undefined) {
      transacoes = transacoes.filter(t => parseFloat(t.valor) >= filtros.valorMin);
    }
    if (filtros.valorMax !== undefined) {
      transacoes = transacoes.filter(t => parseFloat(t.valor) <= filtros.valorMax);
    }

    return {
      orgao,
      total: transacoes.length,
      transacoes,
    };
  } catch (err) {
    throw new BlockchainError(err.message);
  }
}

/**
 * Lista todas as transações (para o dashboard público).
 */
async function listarTodasTransacoes() {
  try {
    const resultado = await consultarChaincode('ListarTodasTransacoes');
    const transacoes = Array.isArray(resultado) ? resultado : [];
    return {
      total: transacoes.length,
      transacoes,
    };
  } catch (err) {
    throw new BlockchainError(err.message);
  }
}

module.exports = {
  registrarTransacao,
  consultarTransacao,
  listarPorOrgao,
  listarTodasTransacoes,
  // Exportar erros para uso nas rotas
  TransacaoNaoEncontradaError,
  TransacaoJaExisteError,
  BlockchainError,
};
