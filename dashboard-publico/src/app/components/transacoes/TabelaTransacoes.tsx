// Transaction table and related loading states.
'use client'

import useSWR from 'swr'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { listTransactions, Transaction } from '@/lib/api'
import { StatusBadge } from '@/app/components/ui/StatusBadge'
import { HashDisplay } from '@/app/components/ui/HashDisplay'
import type { Filters } from '@/app/components/transacoes/FiltrosTransacoes'

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(amount)

export function TransactionTable({ filters }: { filters: Filters }) {
  const { data, error, isLoading } = useSWR<Transaction[]>(
    '/transactions',
    listTransactions,
    { refreshInterval: 5000 }
  )

  const transactions = (data || []).filter((transaction) => {
    if (filters.agency && !transaction.agency.toLowerCase().includes(filters.agency.toLowerCase())) {
      return false
    }

    if (filters.supplier && !transaction.supplier.toLowerCase().includes(filters.supplier.toLowerCase())) {
      return false
    }

    if (filters.minAmount && transaction.amount < Number(filters.minAmount)) {
      return false
    }

    if (filters.maxAmount && transaction.amount > Number(filters.maxAmount)) {
      return false
    }

    const transactionDate = new Date(transaction.timestamp)

    if (filters.startDate && transactionDate < new Date(`${filters.startDate}T00:00:00`)) {
      return false
    }

    if (filters.endDate && transactionDate > new Date(`${filters.endDate}T23:59:59`)) {
      return false
    }

    return true
  })

  if (isLoading) return <LoadingState />
  if (error) return <ErrorState message={error.message} />
  if (!transactions.length) return <EmptyState />

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            {['Órgão', 'Fornecedor', 'Valor', 'Empenho', 'Hash do Bloco', 'Data', 'Status'].map((column) => (
              <th key={column} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {transactions.map((transaction) => (
            <tr key={transaction.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3 font-medium text-gray-900">{transaction.agency}</td>
              <td className="px-4 py-3 text-gray-600">{transaction.supplier}</td>
              <td className="px-4 py-3 font-mono font-semibold text-gray-900">
                {formatCurrency(transaction.amount)}
              </td>
              <td className="px-4 py-3 font-mono text-xs text-gray-500">{transaction.commitmentNumber}</td>
              <td className="px-4 py-3">
                <HashDisplay hash={transaction.blockHash || transaction.documentHash} />
              </td>
              <td className="px-4 py-3 text-gray-500 text-xs">
                {format(new Date(transaction.timestamp), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status="approved" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-16 text-gray-400">
      <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-gray-600 mr-3" />
      Carregando transações da blockchain...
    </div>
  )
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-red-500">
      <p className="font-medium">Erro ao conectar com a API</p>
      <p className="text-sm text-gray-400 mt-1">{message}</p>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex items-center justify-center py-16 text-gray-400">
      Nenhuma transação registrada ainda.
    </div>
  )
}
