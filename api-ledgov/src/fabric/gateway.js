// src/fabric/gateway.js
// Hyperledger Fabric connection layer.
// It keeps the SDK details isolated from the rest of the API.

'use strict';

const grpc = require('@grpc/grpc-js');
const { connect, signers } = require('@hyperledger/fabric-gateway');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

function resolveSingleFile(configuredPath, description) {
  if (!configuredPath) {
    throw new Error(`${description} is not configured`);
  }

  if (fs.existsSync(configuredPath) && fs.statSync(configuredPath).isFile()) {
    return configuredPath;
  }

  const directory = fs.existsSync(configuredPath) && fs.statSync(configuredPath).isDirectory()
    ? configuredPath
    : path.dirname(configuredPath);

  if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) {
    throw new Error(`${description} not found: ${configuredPath}`);
  }

  const files = fs.readdirSync(directory)
    .filter((fileName) => fs.statSync(path.join(directory, fileName)).isFile())
    .sort();

  if (files.length === 0) {
    throw new Error(`No file found for ${description.toLowerCase()} in: ${directory}`);
  }

  return path.join(directory, files[0]);
}

function readCertificate() {
  const certPath = resolveSingleFile(process.env.FABRIC_CERT_PATH, 'certificate');
  return fs.readFileSync(certPath);
}

function readPrivateKey() {
  const keyPath = resolveSingleFile(process.env.FABRIC_KEY_PATH, 'private key');
  return crypto.createPrivateKey(
    fs.readFileSync(keyPath)
  );
}

function readTlsCertificate() {
  const tlsPath = resolveSingleFile(process.env.FABRIC_TLS_CERT_PATH, 'TLS certificate');
  return fs.readFileSync(tlsPath);
}

function createGrpcConnection(tlsCertificate) {
  const credentials = grpc.credentials.createSsl(tlsCertificate);
  return new grpc.Client(
    process.env.FABRIC_PEER_ENDPOINT,
    credentials,
    {
      'grpc.ssl_target_name_override': process.env.FABRIC_PEER_HOST_ALIAS,
    }
  );
}

let gatewayInstance = null;
let grpcClient = null;

function decodeChaincodeResult(buffer) {
  const text = Buffer.from(buffer).toString('utf8').trim();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch (jsonError) {
    return text;
  }
}

async function getGateway() {
  if (gatewayInstance) return gatewayInstance;

  const tlsCertificate = readTlsCertificate();
  const certificate = readCertificate();
  const privateKey = readPrivateKey();

  grpcClient = createGrpcConnection(tlsCertificate);

  gatewayInstance = connect({
    client: grpcClient,
    identity: {
      mspId: process.env.FABRIC_MSP_ID,
      credentials: certificate,
    },
    signer: signers.newPrivateKeySigner(privateKey),
    evaluateOptions: () => ({ deadline: Date.now() + 5000 }),
    endorseOptions: () => ({ deadline: Date.now() + 15000 }),
    submitOptions: () => ({ deadline: Date.now() + 5000 }),
    commitStatusOptions: () => ({ deadline: Date.now() + 60000 }),
  });

  console.log('✅ Gateway connected to peer:', process.env.FABRIC_PEER_ENDPOINT);
  return gatewayInstance;
}

async function getContract() {
  const gateway = await getGateway();
  const network = gateway.getNetwork(process.env.CHANNEL_NAME);
  return network.getContract(process.env.CHAINCODE_NAME);
}

async function invokeChaincode(functionName, ...args) {
  const contract = await getContract();
  const result = await contract.submitTransaction(functionName, ...args);
  return result.length > 0 ? decodeChaincodeResult(result) : null;
}

async function evaluateChaincode(functionName, ...args) {
  const contract = await getContract();
  const result = await contract.evaluateTransaction(functionName, ...args);
  return decodeChaincodeResult(result);
}

function closeGateway() {
  if (gatewayInstance) {
    gatewayInstance.close();
    gatewayInstance = null;
  }
  if (grpcClient) {
    grpcClient.close();
    grpcClient = null;
  }
  console.log('🔌 Gateway disconnected');
}

process.on('SIGTERM', closeGateway);
process.on('SIGINT', closeGateway);

module.exports = { invokeChaincode, evaluateChaincode, getGateway };
