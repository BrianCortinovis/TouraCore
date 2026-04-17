import 'server-only'
import { createServiceRoleClient } from '@touracore/db/server'
import { getCurrentUser } from '@touracore/auth'

export class DocumentAccessError extends Error {
  constructor(message = 'Forbidden: document access denied') {
    super(message)
    this.name = 'DocumentAccessError'
  }
}

export type DocumentType =
  | 'hospitality_invoice'
  | 'b2b_invoice'
  | 'fiscal_receipt'
  | 'ade_corrispettivi'
  | 'credit_note'
  | 'quote'
  | 'receipt'

export type Vertical = 'hospitality' | 'restaurant' | 'wellness' | 'experiences' | 'bike_rental' | 'moto_rental' | 'ski_school'

const TYPE_VERTICAL_MAP: Record<DocumentType, Vertical[]> = {
  hospitality_invoice: ['hospitality'],
  b2b_invoice: ['hospitality', 'restaurant'],
  fiscal_receipt: ['restaurant'],
  ade_corrispettivi: ['restaurant'],
  credit_note: ['hospitality', 'restaurant'],
  quote: ['hospitality', 'restaurant'],
  receipt: ['hospitality', 'restaurant'],
}

/**
 * Verifica che la combinazione document_type + vertical sia semanticamente valida.
 * Es. fiscal_receipt è solo per restaurant.
 */
export function assertValidDocumentTypeForVertical(documentType: DocumentType, vertical: Vertical): void {
  const allowed = TYPE_VERTICAL_MAP[documentType] ?? []
  if (!allowed.includes(vertical)) {
    throw new DocumentAccessError(
      `Document type '${documentType}' non valido per vertical '${vertical}'. Allowed: ${allowed.join(', ')}`,
    )
  }
}

/**
 * Verifica che user ha accesso al document (entity ownership).
 * Throws se non autorizzato.
 */
export async function assertUserOwnsDocument(documentId: string): Promise<{
  documentId: string
  entityId: string
  tenantId: string
  vertical: Vertical
  documentType: DocumentType
}> {
  const user = await getCurrentUser()
  if (!user) throw new DocumentAccessError('Not authenticated')

  const admin = await createServiceRoleClient()
  const { data: doc } = await admin
    .from('documents')
    .select('id, entity_id, tenant_id, vertical, document_type')
    .eq('id', documentId)
    .maybeSingle()

  if (!doc) throw new DocumentAccessError('Document not found')

  // Platform admin
  const { data: pa } = await admin.from('platform_admins').select('user_id').eq('user_id', user.id).maybeSingle()
  if (pa) {
    return {
      documentId,
      entityId: doc.entity_id as string,
      tenantId: doc.tenant_id as string,
      vertical: doc.vertical as Vertical,
      documentType: doc.document_type as DocumentType,
    }
  }

  // Membership
  const { data: m } = await admin
    .from('memberships')
    .select('id')
    .eq('user_id', user.id)
    .eq('tenant_id', doc.tenant_id)
    .eq('is_active', true)
    .maybeSingle()
  if (m) {
    return {
      documentId,
      entityId: doc.entity_id as string,
      tenantId: doc.tenant_id as string,
      vertical: doc.vertical as Vertical,
      documentType: doc.document_type as DocumentType,
    }
  }

  // Agency
  const { data: agencyM } = await admin
    .from('agency_memberships')
    .select('agency_id')
    .eq('user_id', user.id)
    .eq('is_active', true)
  if (agencyM && agencyM.length > 0) {
    const { data: link } = await admin
      .from('agency_tenant_links')
      .select('id')
      .eq('tenant_id', doc.tenant_id)
      .in('agency_id', agencyM.map((a) => a.agency_id as string))
      .eq('status', 'active')
      .maybeSingle()
    if (link) {
      return {
        documentId,
        entityId: doc.entity_id as string,
        tenantId: doc.tenant_id as string,
        vertical: doc.vertical as Vertical,
        documentType: doc.document_type as DocumentType,
      }
    }
  }

  throw new DocumentAccessError()
}

/**
 * Verifica che user ha accesso a creare document su entity.
 */
export async function assertUserOwnsEntityForDocument(entityId: string, vertical: Vertical, documentType: DocumentType): Promise<{ tenantId: string }> {
  // Validate semantic type/vertical
  assertValidDocumentTypeForVertical(documentType, vertical)

  const user = await getCurrentUser()
  if (!user) throw new DocumentAccessError('Not authenticated')

  const admin = await createServiceRoleClient()
  const { data: ent } = await admin
    .from('entities')
    .select('id, tenant_id, kind')
    .eq('id', entityId)
    .maybeSingle()

  if (!ent) throw new DocumentAccessError('Entity not found')

  // Verify entity kind matches vertical
  const verticalToKind: Record<Vertical, string> = {
    hospitality: 'accommodation',
    restaurant: 'restaurant',
    wellness: 'wellness',
    experiences: 'activity',
    bike_rental: 'bike_rental',
    moto_rental: 'moto_rental',
    ski_school: 'ski_school',
  }
  if (ent.kind !== verticalToKind[vertical]) {
    throw new DocumentAccessError(`Entity kind '${ent.kind}' non corrisponde a vertical '${vertical}'`)
  }

  const tenantId = ent.tenant_id as string

  const { data: pa } = await admin.from('platform_admins').select('user_id').eq('user_id', user.id).maybeSingle()
  if (pa) return { tenantId }

  const { data: m } = await admin
    .from('memberships')
    .select('id')
    .eq('user_id', user.id)
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .maybeSingle()
  if (m) return { tenantId }

  const { data: agencyM } = await admin
    .from('agency_memberships')
    .select('agency_id')
    .eq('user_id', user.id)
    .eq('is_active', true)
  if (agencyM && agencyM.length > 0) {
    const { data: link } = await admin
      .from('agency_tenant_links')
      .select('id')
      .eq('tenant_id', tenantId)
      .in('agency_id', agencyM.map((a) => a.agency_id as string))
      .eq('status', 'active')
      .maybeSingle()
    if (link) return { tenantId }
  }

  throw new DocumentAccessError()
}
