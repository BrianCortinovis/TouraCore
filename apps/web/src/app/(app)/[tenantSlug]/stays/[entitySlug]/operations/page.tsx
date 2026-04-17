'use client'

import { useState } from 'react'
import HousekeepingPage from '../housekeeping/page'
import MaintenancePage from '../../../../../(dashboard)/maintenance/page'

export default function OperationsPage() {
  const [tab, setTab] = useState<'housekeeping' | 'maintenance'>('housekeeping')
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 border-b border-gray-200">
        <TabBtn active={tab === 'housekeeping'} onClick={() => setTab('housekeeping')}>Pulizie / Housekeeping</TabBtn>
        <TabBtn active={tab === 'maintenance'} onClick={() => setTab('maintenance')}>Manutenzione</TabBtn>
      </div>
      {tab === 'housekeeping' ? <HousekeepingPage /> : <MaintenancePage />}
    </div>
  )
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium transition-colors ${
        active ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600 hover:text-gray-900'
      }`}
    >
      {children}
    </button>
  )
}
