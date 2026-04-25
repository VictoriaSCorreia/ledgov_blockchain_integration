// server.js - application entry point
'use strict';

require('dotenv').config();

const app = require('./src/app');
const { getGateway } = require('./src/fabric/gateway');

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    // Validate the Fabric connection before accepting HTTP traffic.
    console.log('🔄 Conectando à rede Hyperledger Fabric...');
    await getGateway();

    app.listen(PORT, () => {
      console.log('');
      console.log('╔════════════════════════════════════╗');
      console.log('║        LEDGOV API — Online         ║');
      console.log(`║  http://localhost:${PORT}/api/v1      ║`);
      console.log('╚════════════════════════════════════╝');
      console.log('');
      console.log('Available endpoints:');
      console.log(`  GET    /api/v1/health`);
      console.log(`  POST   /api/v1/transactions`);
      console.log(`  GET    /api/v1/transactions`);
      console.log(`  GET    /api/v1/transactions/:id`);
      console.log(`  GET    /api/v1/transactions/agency/:agency`);
      console.log(`  Legacy aliases under /api/v1/transacoes remain supported`);
      console.log('');
    });
  } catch (err) {
    console.error('❌ Falha ao conectar com a blockchain:', err.message);
    console.error('Verifique se a rede Fabric está rodando: docker ps');
    process.exit(1);
  }
}

start();
