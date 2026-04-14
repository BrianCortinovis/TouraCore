'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '@touracore/auth/store'
import { TabNavigation, type SettingsTab } from './components/tab-navigation'
import { BusinessInfoTab } from './components/business-info-tab'
import { InvoicingTab } from './components/invoicing-tab'
import { CheckinTab } from './components/checkin-tab'
import { CommunicationsTab } from './components/communications-tab'
import { ProfileTab } from './components/profile-tab'
import { getTenantSettingsAction } from './actions'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('business')
  const [settingsMap, setSettingsMap] = useState<Record<string, unknown>>({})
  const [loading, setLoading] = useState(true)
  const { tenant } = useAuthStore()

  const loadSettings = useCallback(async () => {
    setLoading(true)
    try {
      const settings = await getTenantSettingsAction()
      const map: Record<string, unknown> = {}
      for (const s of settings) {
        map[s.key] = s.value
      }
      setSettingsMap(map)
    } catch {
      // Errore gestito dal error boundary
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadSettings()
  }, [loadSettings])

  if (loading) {
    return (
      <div className="text-center py-12 text-gray-500">Caricamento impostazioni...</div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Impostazioni</h1>
      <TabNavigation active={activeTab} onChange={setActiveTab} />

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        {activeTab === 'business' && (
          <BusinessInfoTab
            tenantName={tenant?.name ?? ''}
            tenantSlug={tenant?.slug ?? ''}
            settings={settingsMap}
          />
        )}
        {activeTab === 'invoicing' && <InvoicingTab settings={settingsMap} />}
        {activeTab === 'checkin' && <CheckinTab settings={settingsMap} />}
        {activeTab === 'communications' && <CommunicationsTab settings={settingsMap} />}
        {activeTab === 'profile' && <ProfileTab />}
      </div>
    </div>
  )
}
