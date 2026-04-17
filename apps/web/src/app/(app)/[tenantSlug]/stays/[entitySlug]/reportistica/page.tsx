'use client'

import { useState } from 'react'
import AnalyticsPage from '../../../../../(dashboard)/analytics/page'
import FinancialsPage from '../financials/page'
import ReportsPage from '../reports/page'

export default function ReportisticaPage() {
  const [tab, setTab] = useState<'analytics' | 'financials' | 'reports'>('analytics')
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 border-b border-gray-200">
        <TabBtn active={tab === 'analytics'} onClick={() => setTab('analytics')}>Analytics real-time</TabBtn>
        <TabBtn active={tab === 'financials'} onClick={() => setTab('financials')}>Bilanci</TabBtn>
        <TabBtn active={tab === 'reports'} onClick={() => setTab('reports')}>Export report</TabBtn>
      </div>
      {tab === 'analytics' && <AnalyticsPage />}
      {tab === 'financials' && <FinancialsPage />}
      {tab === 'reports' && <ReportsPage />}
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
