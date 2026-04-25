'use client'

type Status = 'approved' | 'blocked' | 'pending'

const statusConfig = {
  approved: {
    label: 'Aprovado',
    className: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  },
  blocked: {
    label: 'Bloqueado',
    className: 'bg-red-50 text-red-700 border border-red-200',
  },
  pending: {
    label: 'Pendente',
    className: 'bg-amber-50 text-amber-700 border border-amber-200',
  },
}

export function StatusBadge({ status }: { status: Status }) {
  const { label, className } = statusConfig[status]

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${className}`}>
      {label}
    </span>
  )
}
