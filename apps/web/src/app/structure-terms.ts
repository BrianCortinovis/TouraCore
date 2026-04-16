import { getPropertyTypeConfig, type PropertyType } from '@touracore/hospitality-config'

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export function getStructureTerms(propertyType?: string | null) {
  const type = (propertyType ?? 'hotel') as PropertyType
  const config = getPropertyTypeConfig(type)
  const unitLabel = config.unitLabel
  const unitLabelPlural = config.unitLabelPlural
  const isApartment = type === 'apartment'
  const unitLabelTitle = capitalize(unitLabel)
  const unitLabelPluralTitle = capitalize(unitLabelPlural)

  return {
    type,
    unitLabel,
    unitLabelPlural,
    unitLabelTitle,
    unitLabelPluralTitle,
    newUnitLabel: isApartment ? `Nuovo ${unitLabel}` : `Nuova ${unitLabel}`,
    emptyUnitLabel: isApartment
      ? `Nessun ${unitLabel} configurato`
      : `Nessuna ${unitLabel} configurata`,
    roomTypesLabel: `Tipologie ${unitLabelPluralTitle}`,
    newRoomTypeLabel: `Nuova tipologia ${unitLabel}`,
    emptyRoomTypeLabel: `Nessuna tipologia ${unitLabel} configurata`,
    roomsSectionLabel: unitLabelPluralTitle,
    roomTypesSectionLabel: `Tipologie ${unitLabelPluralTitle}`,
    roomBlocksSectionLabel: `Blocchi ${unitLabelPluralTitle}`,
  }
}
