import { useMemo } from 'react'
import { useAuthStore } from '../stores/auth-store'
import {
  PROPERTY_TYPE_CONFIGS,
  getEffectiveFiscalConfig,
  getEffectiveCompliance,
  getEffectiveInvoicing,
  type PropertyTypeConfig,
  type PropertyFiscalRules,
  type PropertyCompliance,
  type PropertyInvoicing,
} from '../config/property-types'

interface PropertyConfigResult {
  config: PropertyTypeConfig
  fiscal: PropertyFiscalRules
  compliance: PropertyCompliance
  invoicing: PropertyInvoicing
  isImprenditoriale: boolean
}

export function usePropertyConfig(): PropertyConfigResult {
  const { property } = useAuthStore()

  return useMemo(() => {
    const propertyType = property?.type ?? 'hotel'
    const isImprenditoriale = property?.is_imprenditoriale ?? true
    const config = PROPERTY_TYPE_CONFIGS[propertyType]!

    return {
      config,
      fiscal: getEffectiveFiscalConfig(propertyType, isImprenditoriale),
      compliance: getEffectiveCompliance(propertyType, isImprenditoriale),
      invoicing: getEffectiveInvoicing(propertyType, isImprenditoriale),
      isImprenditoriale,
    }
  }, [property?.type, property?.is_imprenditoriale])
}
