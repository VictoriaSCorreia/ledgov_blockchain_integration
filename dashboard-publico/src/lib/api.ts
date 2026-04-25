const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1'

type TransactionListApiResponse = {
  success?: boolean
  total: number
  transactions?: TransactionApi[]
  transacoes?: TransactionApi[]
}

type TransactionApi = {
  id: string
  agency?: string
  orgao?: string
  supplier?: string
  fornecedor?: string
  amount?: number | string
  valor?: number | string
  commitmentNumber?: string
  numEmpenho?: string
  num_empenho?: string
  documentHash?: string
  hashDocumento?: string
  hash_documento?: string
  digitalSignature?: string
  assinatura?: string
  descricao?: string
  timestamp: string
}

async function requestJson<T>(url: string): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`)

  if (!res.ok) {
    throw new Error('Erro na API: ' + res.status)
  }

  return res.json()
}

export const fetcher = requestJson

export type Transaction = {
  id: string
  agency: string
  supplier: string
  amount: number
  commitmentNumber: string
  documentHash: string
  timestamp: string
  digitalSignature: string
  blockHash?: string
  blockNumber?: number
}

function normalizeTransaction(transaction: TransactionApi): Transaction {
  const rawAmount = transaction.amount ?? transaction.valor ?? 0

  return {
    id: transaction.id,
    agency: transaction.agency ?? transaction.orgao ?? '',
    supplier: transaction.supplier ?? transaction.fornecedor ?? '',
    amount: Number(rawAmount),
    commitmentNumber: transaction.commitmentNumber ?? transaction.numEmpenho ?? transaction.num_empenho ?? '',
    documentHash: transaction.documentHash ?? transaction.hashDocumento ?? transaction.hash_documento ?? '',
    timestamp: transaction.timestamp,
    digitalSignature: transaction.digitalSignature ?? transaction.assinatura ?? transaction.descricao ?? '',
  }
}

export async function listTransactions(): Promise<Transaction[]> {
  const response = await requestJson<TransactionListApiResponse>('/transactions')
  const transactions = response.transactions ?? response.transacoes ?? []
  return transactions.map(normalizeTransaction)
}

export type AgencySummary = {
  agency: string
  totalTransactions: number
  totalAmount: number
  lastTransaction: string
}
