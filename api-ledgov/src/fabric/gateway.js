// src/fabric/gateway.js
// Camada de conexão com o Hyperledger Fabric
// Abstrai toda a complexidade do SDK para o resto da aplicação

'use strict';

const grpc = require('@grpc/grpc-js');
const { connect, hash, signers } = require('@hyperledger/fabric-gateway');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

// ──────────────────────────────────────────────
// Leitura de certificados (feita uma vez no boot)
// ──────────────────────────────────────────────

function resolverArquivoUnico(caminhoInformado, descricao) {
  if (!caminhoInformado) {
    throw new Error(`${descricao} não configurado(a)`);
  }

  if (fs.existsSync(caminhoInformado) && fs.statSync(caminhoInformado).isFile()) {
    return caminhoInformado;
  }

  const diretorio = fs.existsSync(caminhoInformado) && fs.statSync(caminhoInformado).isDirectory()
    ? caminhoInformado
    : path.dirname(caminhoInformado);

  if (!fs.existsSync(diretorio) || !fs.statSync(diretorio).isDirectory()) {
    throw new Error(`${descricao} não encontrado(a): ${caminhoInformado}`);
  }

  const arquivos = fs.readdirSync(diretorio)
    .filter((arquivo) => fs.statSync(path.join(diretorio, arquivo)).isFile())
    .sort();

  if (arquivos.length === 0) {
    throw new Error(`Nenhum arquivo encontrado para ${descricao.toLowerCase()} em: ${diretorio}`);
  }

  return path.join(diretorio, arquivos[0]);
}

function lerCertificado() {
  const certPath = resolverArquivoUnico(process.env.FABRIC_CERT_PATH, 'Certificado');
  return fs.readFileSync(certPath);
}

function lerChavePrivada() {
  const keyPath = resolverArquivoUnico(process.env.FABRIC_KEY_PATH, 'Chave privada');
  return crypto.createPrivateKey(
    fs.readFileSync(keyPath)
  );
}

function lerTLSCert() {
  const tlsPath = process.env.FABRIC_TLS_CERT_PATH;
  if (!fs.existsSync(tlsPath)) {
    throw new Error(`Certificado TLS não encontrado: ${tlsPath}`);
  }
  return fs.readFileSync(tlsPath);
}

// ──────────────────────────────────────────────
// Criação da conexão gRPC com o peer
// ──────────────────────────────────────────────
// Por que gRPC? O Fabric usa gRPC como protocolo de comunicação
// (mais eficiente que REST para comunicação interna entre serviços).
// O SDK cuida da serialização — você só vê JSON no seu código.

function criarConexaoGRPC(tlsCert) {
  const credentials = grpc.credentials.createSsl(tlsCert);
  return new grpc.Client(
    process.env.FABRIC_PEER_ENDPOINT,
    credentials,
    {
      'grpc.ssl_target_name_override': process.env.FABRIC_PEER_HOST_ALIAS,
    }
  );
}

// ──────────────────────────────────────────────
// Gateway singleton — conexão reutilizável
// ──────────────────────────────────────────────
// Criar uma nova conexão a cada request seria lento (TLS handshake).
// O padrão correto é manter uma conexão aberta e reutilizá-la.

let gatewayInstance = null;
let grpcClient = null;

function decodificarResultadoChaincode(buffer) {
  const texto = Buffer.from(buffer).toString('utf8').trim();

  if (!texto) {
    return null;
  }

  try {
    return JSON.parse(texto);
  } catch (erroJson) {
    // Alguns contratos podem retornar texto simples em vez de JSON.
    return texto;
  }
}

async function obterGateway() {
  if (gatewayInstance) return gatewayInstance;

  const tlsCert = lerTLSCert();
  const certificado = lerCertificado();
  const chavePrivada = lerChavePrivada();

  grpcClient = criarConexaoGRPC(tlsCert);

  gatewayInstance = connect({
    client: grpcClient,
    identity: {
      mspId: process.env.FABRIC_MSP_ID,
      credentials: certificado,
    },
    signer: signers.newPrivateKeySigner(chavePrivada),
    // Configurações de timeout (importante para produção)
    evaluateOptions: () => ({ deadline: Date.now() + 5000 }),   // query: 5s
    endorseOptions: () => ({ deadline: Date.now() + 15000 }),   // endosso: 15s
    submitOptions: () => ({ deadline: Date.now() + 5000 }),     // submit: 5s
    commitStatusOptions: () => ({ deadline: Date.now() + 60000 }), // commit: 60s
  });

  console.log('✅ Gateway conectado ao peer:', process.env.FABRIC_PEER_ENDPOINT);
  return gatewayInstance;
}

// ──────────────────────────────────────────────
// Funções de acesso ao chaincode
// ──────────────────────────────────────────────

async function obterContrato() {
  const gateway = await obterGateway();
  const network = gateway.getNetwork(process.env.CHANNEL_NAME);
  return network.getContract(process.env.CHAINCODE_NAME);
}

// INVOKE — grava na blockchain (cria bloco, requer consenso)
// Retorna: resultado da transação como objeto JavaScript
async function invocarChaincode(funcao, ...args) {
  const contrato = await obterContrato();
  const resultado = await contrato.submitTransaction(funcao, ...args);
  return resultado.length > 0 ? decodificarResultadoChaincode(resultado) : null;
}

// QUERY — lê da blockchain (sem bloco, sem consenso, instantâneo)
// Retorna: dados atuais do world state
async function consultarChaincode(funcao, ...args) {
  const contrato = await obterContrato();
  const resultado = await contrato.evaluateTransaction(funcao, ...args);
  return decodificarResultadoChaincode(resultado);
}

// Fechar conexão ao encerrar o processo
function fecharGateway() {
  if (gatewayInstance) {
    gatewayInstance.close();
    gatewayInstance = null;
  }
  if (grpcClient) {
    grpcClient.close();
    grpcClient = null;
  }
  console.log('🔌 Gateway desconectado');
}

process.on('SIGTERM', fecharGateway);
process.on('SIGINT', fecharGateway);

module.exports = { invocarChaincode, consultarChaincode, obterGateway };
