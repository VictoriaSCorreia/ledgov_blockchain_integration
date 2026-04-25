// Endpoint integration tests.
// Gateway calls are mocked so the suite does not depend on a running Fabric network.

'use strict';

const request = require('supertest');
const app = require('../app');

jest.mock('../fabric/gateway', () => ({
  invokeChaincode: jest.fn(),
  evaluateChaincode: jest.fn(),
  getGateway: jest.fn().mockResolvedValue({}),
}));

const { invokeChaincode, evaluateChaincode } = require('../fabric/gateway');

describe('POST /api/v1/transactions', () => {
  const validPayload = {
    agency: 'Secretaria de Educação',
    supplier: 'Livraria Acadêmica Ltda',
    amount: 12500.00,
    commitmentNumber: '2025NE000456',
  };

  test('returns 201 for a valid transaction', async () => {
    invokeChaincode.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/v1/transactions')
      .send(validPayload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toMatch(/^TRX-/);
    expect(res.body.data.status).toBe('RECORDED');
  });

  test('accepts legacy Portuguese request fields', async () => {
    invokeChaincode.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/v1/transacoes')
      .send({
        orgao: 'Secretaria de Saúde',
        fornecedor: 'Empresa Legada Ltda',
        valor: 3200,
        numEmpenho: '2025NE000789',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  test('returns 400 when a required field is missing', async () => {
    const res = await request(app)
      .post('/api/v1/transactions')
      .send({ agency: 'Secretaria', amount: 1000 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe(true);
    expect(res.body.code).toBe('REQUIRED_FIELDS_MISSING');
    expect(res.body.fields).toContain('supplier');
    expect(res.body.fields).toContain('commitmentNumber');
  });

  test('returns 400 when the amount is negative', async () => {
    const res = await request(app)
      .post('/api/v1/transactions')
      .send({ ...validPayload, amount: -500 });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_AMOUNT');
  });

  test('still short-circuits invalid input before the smart contract call', async () => {
    invokeChaincode.mockRejectedValue(
      new Error('BLOQUEADO: transação sem número de empenho')
    );

    const res = await request(app)
      .post('/api/v1/transactions')
      .send({ ...validPayload, commitmentNumber: '' });

    expect(res.status).toBe(400);
  });
});

describe('GET /api/v1/transactions/:id', () => {
  test('returns an existing transaction', async () => {
    const transactionMock = {
      id: 'TRX-TESTE-001',
      agency: 'Secretaria de Saúde',
      amount: '5000',
    };
    evaluateChaincode.mockResolvedValue(transactionMock);

    const res = await request(app).get('/api/v1/transactions/TRX-TESTE-001');

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe('TRX-TESTE-001');
  });

  test('returns 404 for a missing transaction', async () => {
    evaluateChaincode.mockRejectedValue(
      new Error('transaction does not exist')
    );

    const res = await request(app).get('/api/v1/transactions/TRX-INEXISTENTE');

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('TRANSACTION_NOT_FOUND');
  });
});

describe('GET /api/v1/health', () => {
  test('returns status ok', async () => {
    const res = await request(app).get('/api/v1/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
