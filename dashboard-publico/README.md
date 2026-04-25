# Dashboard Publico LEDGOV

## Desenvolvimento

O frontend roda em `http://localhost:3001` e consome a API em `http://localhost:3000/api/v1`.

Antes de iniciar o dashboard, suba a API LEDGOV.

### API

```bash
cd ~/ledgov/api-ledgov
npm run dev
```

### Frontend

```bash
cd ~/ledgov/dashboard-publico
npm run dev
```

Abra `http://localhost:3001` no navegador.

## Observacoes

- A API usa a porta `3000`.
- O frontend usa a porta `3001`.
- A rede Hyperledger Fabric precisa estar ativa para a API responder as consultas.
