'use client'

import { useState } from 'react'
import InboxPage from '../../../../../(dashboard)/inbox/page'
import CommunicationsPage from '../communications/page'

export default function MessaggiPage() {
  const [tab, setTab] = useState<'inbox' | 'templates'>('inbox')
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 border-b border-gray-200">
        <TabBtn active={tab === 'inbox'} onClick={() => setTab('inbox')}>Inbox 2-way</TabBtn>
        <TabBtn active={tab === 'templates'} onClick={() => setTab('templates')}>Template + Automazioni</TabBtn>
      </div>
      {tab === 'inbox' ? <InboxPage /> : <CommunicationsPage />}
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
