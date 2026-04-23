'use client'

export function PrintButton() {
  return (
    <button
      onClick={() => { if (typeof window !== 'undefined') window.print() }}
      className="rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800"
    >
      Stampa
    </button>
  )
}
