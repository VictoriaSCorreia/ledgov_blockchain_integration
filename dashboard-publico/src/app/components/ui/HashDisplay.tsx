// Compact hash viewer with copy support.
'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

export function HashDisplay({ hash }: { hash: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(hash)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex items-center gap-2 font-mono text-xs text-gray-500">
      <span className="truncate max-w-[180px]" title={hash}>
        {hash.slice(0, 8)}...{hash.slice(-6)}
      </span>
      <button
        onClick={handleCopy}
        className="flex-shrink-0 p-1 rounded hover:bg-gray-100 transition-colors"
        title="Copiar hash completo"
      >
        {copied
          ? <Check size={12} className="text-emerald-600" />
          : <Copy size={12} className="text-gray-400" />
        }
      </button>
    </div>
  )
}
