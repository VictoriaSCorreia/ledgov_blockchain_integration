// Transaction filter controls.
'use client'

import type { ChangeEvent } from 'react'
import { Search, Filter, X } from 'lucide-react'

export type Filters = {
  agency: string
  supplier: string
  minAmount: string
  maxAmount: string
  startDate: string
  endDate: string
}

type Props = {
  filters: Filters
  onChange: (filters: Filters) => void
  onClear: () => void
}

export const EMPTY_FILTERS: Filters = {
  agency: '',
  supplier: '',
  minAmount: '',
  maxAmount: '',
  startDate: '',
  endDate: '',
}

export function TransactionFilters({ filters, onChange, onClear }: Props) {
  const hasActiveFilter = Object.values(filters).some((value) => value !== '')

  const updateField = (field: keyof Filters) =>
    (event: ChangeEvent<HTMLInputElement>) =>
      onChange({ ...filters, [field]: event.target.value })

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <Filter size={14} />
          Filtros
        </div>
        {hasActiveFilter && (
          <button
            onClick={onClear}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
          >
            <X size={12} /> Limpar filtros
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <FilterField
          label="Órgão / Secretaria"
          placeholder="Ex: Secretaria de Saúde"
          value={filters.agency}
          onChange={updateField('agency')}
        />
        <FilterField
          label="Fornecedor"
          placeholder="Nome ou CNPJ"
          value={filters.supplier}
          onChange={updateField('supplier')}
        />
        <FilterField
          label="Valor mínimo (R$)"
          placeholder="0,00"
          type="number"
          value={filters.minAmount}
          onChange={updateField('minAmount')}
        />
        <FilterField
          label="Valor máximo (R$)"
          placeholder="Ex: 100000"
          type="number"
          value={filters.maxAmount}
          onChange={updateField('maxAmount')}
        />
        <FilterField
          label="Data início"
          type="date"
          value={filters.startDate}
          onChange={updateField('startDate')}
        />
        <FilterField
          label="Data fim"
          type="date"
          value={filters.endDate}
          onChange={updateField('endDate')}
        />
      </div>
    </div>
  )
}

function FilterField({
  label, placeholder, type = 'text', value, onChange,
}: {
  label: string
  placeholder?: string
  type?: string
  value: string
  onChange: (event: ChangeEvent<HTMLInputElement>) => void
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <div className="relative">
        {type === 'text' && (
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-300" />
        )}
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`w-full rounded-md border border-gray-200 text-sm py-1.5 pr-3 
            ${type === 'text' ? 'pl-7' : 'pl-3'}
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
        />
      </div>
    </div>
  )
}
