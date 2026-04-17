'use server'

import { revalidatePath } from 'next/cache'
import { createServiceRoleClient } from '@touracore/db/server'
import { z } from 'zod'
import {
  assertUserOwnsDocument,
  assertUserOwnsEntityForDocument,
  type DocumentType,
  type Vertical,
} from '@/lib/documents-guard'
import { buildSDIXml } from '@/lib/sdi-xml'

const CreateDocumentSchema = z.object({
  tenantSlug: z.string(),
  entityId: z.string().uuid(),
  vertical: z.enum(['hospitality', 'restaurant', 'wellness', 'experiences', 'bike_rental', 'moto_rental', 'ski_school']),
  documentType: z.enum(['hospitality_invoice', 'b2b_invoice', 'fiscal_receipt', 'ade_corrispettivi', 'credit_note', 'quote', 'receipt']),
  documentNumber: z.string().min(1).max(40),
  documentDate: z.string(),
  customerName: z.string().min(1).max(200),
  customerVatNumber: z.string().optional(),
  customerFiscalCode: z.string().optional(),
  customerSdiCode: z.string().optional(),
  customerPec: z.string().email().optional().or(z.literal('')),
  customerAddress: z.string().optional(),
  customerCity: z.string().optional(),
  customerZip: z.string().optional(),
  customerCountry: z.string().default('IT'),
  amountSubtotal: z.number().min(0),
  vatPct: z.number().min(0).max(30),
  description: z.string().optional(),
  generateSdiXml: z.boolean().default(false),
  sourceType: z.string().optional(),
  sourceId: z.string().uuid().optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
})

export async function createDocument(input: z.infer<typeof CreateDocumentSchema>) {
  const parsed = CreateDocumentSchema.parse(input)
  const { tenantId } = await assertUserOwnsEntityForDocument(
    parsed.entityId,
    parsed.vertical as Vertical,
    parsed.documentType as DocumentType,
  )

  const admin = await createServiceRoleClient()

  const vatAmount = +(parsed.amountSubtotal * (parsed.vatPct / 100)).toFixed(2)
  const total = +(parsed.amountSubtotal + vatAmount).toFixed(2)

  let xmlPayload: string | null = null

  // Genera XML SDI per fatture B2B/hospitality
  if (parsed.generateSdiXml && (parsed.documentType === 'b2b_invoice' || parsed.documentType === 'hospitality_invoice')) {
    // Carica entity fiscal info
    const { data: ent } = await admin
      .from('entities')
      .select('kind, name')
      .eq('id', parsed.entityId)
      .single()

    let fiscalConfig: { vat?: string; cf?: string; legalName?: string; address?: string; city?: string; zip?: string; province?: string; regime?: string } = {}

    if (ent?.kind === 'accommodation') {
      const { data: acc } = await admin
        .from('accommodations')
        .select('vat_number, fiscal_code, legal_name, address, city, zip, province, fiscal_regime')
        .eq('entity_id', parsed.entityId)
        .single()
      if (acc) {
        fiscalConfig = {
          vat: acc.vat_number as string,
          cf: acc.fiscal_code as string,
          legalName: acc.legal_name as string,
          address: acc.address as string,
          city: acc.city as string,
          zip: acc.zip as string,
          province: acc.province as string,
          regime: (acc.fiscal_regime as string) ?? 'RF01',
        }
      }
    } else if (ent?.kind === 'restaurant') {
      const { data: rest } = await admin
        .from('restaurants')
        .select('settings')
        .eq('id', parsed.entityId)
        .single()
      const settings = (rest?.settings as Record<string, unknown>) ?? {}
      fiscalConfig = {
        vat: settings.vat_number as string,
        cf: settings.fiscal_code as string,
        legalName: (settings.legal_name as string) ?? ent.name,
        address: settings.address as string,
        city: settings.city as string,
        zip: settings.zip as string,
        province: settings.province as string,
        regime: (settings.fiscal_regime as string) ?? 'RF01',
      }
    }

    if (!fiscalConfig.vat) {
      throw new Error('Partita IVA mancante nelle impostazioni')
    }

    // Progressivo
    const year = new Date(parsed.documentDate).getFullYear()
    const { count } = await admin
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .eq('entity_id', parsed.entityId)
      .in('document_type', ['hospitality_invoice', 'b2b_invoice'])
      .gte('document_date', `${year}-01-01`)

    xmlPayload = buildSDIXml(
      {
        cedenteVatNumber: fiscalConfig.vat,
        cedenteFiscalCode: fiscalConfig.cf,
        cedenteName: fiscalConfig.legalName ?? 'Operatore',
        cedenteRegime: (fiscalConfig.regime ?? 'RF01') as 'RF01',
        cedenteAddress: fiscalConfig.address ?? '',
        cedenteCity: fiscalConfig.city ?? '',
        cedenteZip: fiscalConfig.zip ?? '00000',
        cedenteProvince: fiscalConfig.province ?? '',
        customerVatNumber: parsed.customerVatNumber,
        customerFiscalCode: parsed.customerFiscalCode,
        customerName: parsed.customerName,
        customerAddress: parsed.customerAddress,
        customerCity: parsed.customerCity,
        customerZip: parsed.customerZip,
        customerCountry: parsed.customerCountry,
        customerSdiCode: parsed.customerSdiCode,
        customerPec: parsed.customerPec || undefined,
        invoiceNumber: parsed.documentNumber,
        invoiceDate: parsed.documentDate,
        invoiceType: 'TD01',
        lines: [
          {
            number: 1,
            description: parsed.description ?? 'Servizi',
            qty: 1,
            unitPrice: parsed.amountSubtotal,
            vatPct: parsed.vatPct,
          },
        ],
      },
      String((count ?? 0) + 1).padStart(5, '0'),
    )
  }

  const { data, error } = await admin
    .from('documents')
    .insert({
      tenant_id: tenantId,
      entity_id: parsed.entityId,
      document_type: parsed.documentType,
      vertical: parsed.vertical,
      document_number: parsed.documentNumber,
      document_date: parsed.documentDate,
      customer_name: parsed.customerName,
      customer_vat_number: parsed.customerVatNumber ?? null,
      customer_fiscal_code: parsed.customerFiscalCode ?? null,
      customer_pec: parsed.customerPec || null,
      customer_sdi_code: parsed.customerSdiCode ?? null,
      customer_address: parsed.customerAddress ?? null,
      customer_city: parsed.customerCity ?? null,
      customer_zip: parsed.customerZip ?? null,
      customer_country: parsed.customerCountry,
      amount_subtotal: parsed.amountSubtotal,
      amount_vat: vatAmount,
      amount_total: total,
      vat_pct: parsed.vatPct,
      description: parsed.description ?? null,
      xml_payload: xmlPayload,
      sdi_status: xmlPayload ? 'draft' : null,
      source_type: parsed.sourceType ?? null,
      source_id: parsed.sourceId ?? null,
      metadata: parsed.metadata,
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)

  revalidatePath(`/${parsed.tenantSlug}/documents`)
  return { documentId: data.id as string }
}

export async function downloadDocumentXml(documentId: string): Promise<{ filename: string; xml: string }> {
  await assertUserOwnsDocument(documentId)
  const admin = await createServiceRoleClient()
  const { data: doc } = await admin
    .from('documents')
    .select('document_number, xml_payload, entity_id, vertical')
    .eq('id', documentId)
    .single()
  if (!doc?.xml_payload) throw new Error('XML non disponibile')

  return {
    filename: `${doc.document_number}.xml`,
    xml: doc.xml_payload as string,
  }
}

export async function markDocumentSubmitted(documentId: string, tenantSlug: string): Promise<void> {
  await assertUserOwnsDocument(documentId)
  const admin = await createServiceRoleClient()
  await admin
    .from('documents')
    .update({ sdi_status: 'submitted', sdi_submitted_at: new Date().toISOString() })
    .eq('id', documentId)
  revalidatePath(`/${tenantSlug}/documents`)
}

export async function markDocumentPaid(documentId: string, tenantSlug: string, paidAmount?: number): Promise<void> {
  await assertUserOwnsDocument(documentId)
  const admin = await createServiceRoleClient()
  const { data: doc } = await admin.from('documents').select('amount_total').eq('id', documentId).single()
  if (!doc) throw new Error('Document not found')

  const finalPaid = paidAmount ?? Number(doc.amount_total)
  await admin.from('documents').update({
    payment_status: finalPaid >= Number(doc.amount_total) ? 'paid' : 'partial',
    paid_amount: finalPaid,
  }).eq('id', documentId)

  revalidatePath(`/${tenantSlug}/documents`)
}

export async function deleteDocument(documentId: string, tenantSlug: string): Promise<void> {
  await assertUserOwnsDocument(documentId)
  const admin = await createServiceRoleClient()
  await admin.from('documents').delete().eq('id', documentId)
  revalidatePath(`/${tenantSlug}/documents`)
}
