'use client'

import type { ReactNode } from 'react'
import { useState } from 'react'
import { Shield, Activity, Clock, AlertTriangle } from 'lucide-react'
import useSWR from 'swr'
import { listTransactions, Transaction } from '@/lib/api'
import { TransactionTable } from '@/app/components/transacoes/TabelaTransacoes'
import { TransactionFilters, Filters, EMPTY_FILTERS } from '@/app/components/transacoes/FiltrosTransacoes'

type Metrics = {
  totalTransactions: number
  totalAmount: number
  activeAgencies: number
  anomalyAlerts: number
}

export default function HomePage() {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)

  const { data: transactions = [] } = useSWR<Transaction[]>(
    '/transactions',
    listTransactions,
    { refreshInterval: 30000 }
  )

  const totalAmount = transactions.reduce((accumulator, transaction) => accumulator + transaction.amount, 0)
  const activeAgencies = new Set(transactions.map((transaction) => transaction.agency)).size
  const metrics: Metrics = {
    totalTransactions: transactions.length,
    totalAmount,
    activeAgencies,
    anomalyAlerts: 0,
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Shield size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 tracking-tight">LEDGOV</h1>
              <p className="text-xs text-gray-400">Transparência pública em tempo real</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-emerald-600 font-medium">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Blockchain ativa
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            icon={<Activity size={18} />}
            label="Total de Transações"
            value={metrics.totalTransactions.toLocaleString('pt-BR')}
            color="blue"
          />
          <MetricCard
            icon={<Shield size={18} />}
            label="Volume Total"
            value={`R$ ${(metrics.totalAmount / 1e6).toFixed(1)}M`}
            color="emerald"
          />
          <MetricCard
            icon={<Clock size={18} />}
            label="Órgãos Monitorados"
            value={metrics.activeAgencies.toString()}
            color="violet"
          />
          <MetricCard
            icon={<AlertTriangle size={18} />}
            label="Alertas de Anomalia"
            value={metrics.anomalyAlerts.toString()}
            color={metrics.anomalyAlerts ? 'amber' : 'gray'}
          />
        </div>

        <TransactionFilters
          filters={filters}
          onChange={setFilters}
          onClear={() => setFilters(EMPTY_FILTERS)}
        />

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700">
              Transações Registradas
            </h2>
            <span className="text-xs text-gray-400">
              Atualiza automaticamente a cada 5 segundos
            </span>
          </div>
          <TransactionTable filters={filters} />
        </div>
      </div>
    </main>
  )
}

function MetricCard({
  icon, label, value, color,
}: {
  icon: ReactNode
  label: string
  value: string
  color: 'blue' | 'emerald' | 'violet' | 'amber' | 'gray'
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    violet: 'bg-violet-50 text-violet-600',
    amber: 'bg-amber-50 text-amber-600',
    gray: 'bg-gray-100 text-gray-400',
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className={`inline-flex p-2 rounded-lg mb-3 ${colorClasses[color]}`}>
        {icon}
      </div>
      <div className="text-2xl font-bold text-gray-900 tabular-nums">{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  )
}
