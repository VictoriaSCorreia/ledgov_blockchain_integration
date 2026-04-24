// server.js — ponto de entrada da aplicação
'use strict';

require('dotenv').config();

const app = require('./src/app');
const { obterGateway } = require('./src/fabric/gateway');

const PORT = process.env.PORT || 3000;

async function iniciar() {
  try {
    // Testar conexão com a blockchain antes de abrir o servidor
    console.log('🔄 Conectando à rede Hyperledger Fabric...');
    await obterGateway();

    // Só abrir o servidor após conexão bem-sucedida
    app.listen(PORT, () => {
      console.log('');
      console.log('╔════════════════════════════════════╗');
      console.log('║        LEDGOV API — Online         ║');
      console.log(`║  http://localhost:${PORT}/api/v1      ║`);
      console.log('╚════════════════════════════════════╝');
      console.log('');
      console.log('Endpoints disponíveis:');
      console.log(`  GET    /api/v1/health`);
      console.log(`  POST   /api/v1/transacoes`);
      console.log(`  GET    /api/v1/transacoes`);
      console.log(`  GET    /api/v1/transacoes/:id`);
      console.log(`  GET    /api/v1/transacoes/orgao/:orgao`);
      console.log('');
    });
  } catch (err) {
    console.error('❌ Falha ao conectar com a blockchain:', err.message);
    console.error('Verifique se a rede Fabric está rodando: docker ps');
    process.exit(1);
  }
}

iniciar();