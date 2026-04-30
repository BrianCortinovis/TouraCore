/**
 * Email templates branded TouraCore per messaggi enqueued in message_queue.
 * Render HTML inline-styled compatibile Gmail/Outlook/Apple Mail.
 */

interface BookingTemplateData {
  guestName: string
  entityName: string
  reservationCode: string
  checkIn: string
  checkOut: string
  guests?: { adults: number; children?: number }
  total: string
  currency?: string
  specialRequests?: string | null
  type: 'stays' | 'bike' | 'restaurant' | 'experience'
}

const SHELL_OPEN = `<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="margin:0;padding:0;background-color:#f5f5f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;"><table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" width="100%" style="max-width:560px;margin:32px auto;background-color:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e7e5e4;"><tr><td style="padding:32px 40px;background-color:#1c1917;color:#fafaf9;"><div style="font-size:11px;letter-spacing:2px;color:#a8a29e;font-weight:600;">TOURACORE</div><div style="font-size:11px;color:#a8a29e;margin-top:4px;">TOURISM PLATFORM</div></td></tr><tr><td style="padding:40px;color:#1c1917;line-height:1.5;">`

const SHELL_CLOSE = `</td></tr><tr><td style="padding:24px 40px;background-color:#fafaf9;border-top:1px solid #e7e5e4;font-size:13px;color:#78716c;"><p style="margin:0 0 8px 0;">Hai bisogno d'aiuto? Scrivi a <a href="mailto:info@touracore.com" style="color:#0f766e;text-decoration:none;">info@touracore.com</a></p><p style="margin:0;font-size:11px;color:#a8a29e;">© TouraCore — Piattaforma multi-vertical per il turismo italiano.</p></td></tr></table></body></html>`

function row(label: string, value: string) {
  return `<tr><td style="padding:8px 0;color:#78716c;font-size:13px;">${escapeHtml(label)}</td><td style="padding:8px 0;font-weight:600;text-align:right;">${escapeHtml(value)}</td></tr>`
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
}

const TYPE_LABELS = {
  stays: 'Prenotazione confermata',
  bike: 'Noleggio bici confermato',
  restaurant: 'Tavolo prenotato',
  experience: 'Esperienza prenotata',
}

const TYPE_INTRO = {
  stays: 'la tua prenotazione è confermata.',
  bike: 'il tuo noleggio è confermato.',
  restaurant: 'il tuo tavolo è prenotato.',
  experience: 'la tua esperienza è prenotata.',
}

const TYPE_OUTRO = {
  stays: 'Riceverai info dettagliate per check-in qualche giorno prima dell\'arrivo. Buon soggiorno!',
  bike: 'Presentati al pickup con un documento valido. Buon noleggio!',
  restaurant: 'Ti aspettiamo. Per modifiche contatta direttamente la struttura.',
  experience: 'Riceverai info dettagliate via email prima dell\'esperienza.',
}

export function renderBookingConfirmationHtml(d: BookingTemplateData): string {
  const heading = TYPE_LABELS[d.type]
  const intro = TYPE_INTRO[d.type]
  const outro = TYPE_OUTRO[d.type]
  const currency = d.currency ?? 'EUR'

  const guestsLabel = d.guests
    ? `${d.guests.adults} adult${d.guests.adults !== 1 ? 'i' : 'o'}${d.guests.children ? ` + ${d.guests.children} bambin${d.guests.children !== 1 ? 'i' : 'o'}` : ''}`
    : null

  const rows = [
    row('Codice', d.reservationCode),
    row('Struttura', d.entityName),
    d.type === 'stays' || d.type === 'bike'
      ? row(d.type === 'bike' ? 'Ritiro' : 'Check-in', d.checkIn)
      : row('Data', d.checkIn),
    d.type === 'stays' || d.type === 'bike'
      ? row(d.type === 'bike' ? 'Restituzione' : 'Check-out', d.checkOut)
      : '',
    guestsLabel ? row('Ospiti', guestsLabel) : '',
    row('Totale', `${d.total} ${currency}`),
  ].filter(Boolean).join('')

  const requestsBlock = d.specialRequests
    ? `<div style="margin-top:24px;padding:16px;background-color:#fef3c7;border-radius:8px;border-left:3px solid #d97706;"><div style="font-size:11px;letter-spacing:1px;color:#92400e;font-weight:600;margin-bottom:4px;">RICHIESTE SPECIALI</div><div style="font-size:14px;color:#1c1917;">${escapeHtml(d.specialRequests)}</div></div>`
    : ''

  const inner = `<h1 style="font-size:22px;margin:0 0 8px 0;color:#1c1917;font-weight:700;">${heading}</h1><p style="margin:0 0 24px 0;color:#44403c;">Ciao ${escapeHtml(d.guestName)}, ${intro}</p><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse:collapse;">${rows}</table>${requestsBlock}<p style="margin:32px 0 0 0;color:#44403c;font-size:14px;">${outro}</p>`

  return SHELL_OPEN + inner + SHELL_CLOSE
}

interface OwnerNotifyData {
  entityName: string
  reservationCode: string
  guestName: string
  guestEmail: string
  guestPhone?: string | null
  checkIn: string
  checkOut: string
  guests?: { adults: number; children?: number }
  total: string
  currency?: string
  specialRequests?: string | null
  cmsUrl: string
  type: 'stays' | 'bike' | 'restaurant' | 'experience'
}

export function renderOwnerNotificationHtml(d: OwnerNotifyData): string {
  const currency = d.currency ?? 'EUR'
  const guestsLabel = d.guests
    ? `${d.guests.adults} adult${d.guests.adults !== 1 ? 'i' : 'o'}${d.guests.children ? ` + ${d.guests.children} bambin${d.guests.children !== 1 ? 'i' : 'o'}` : ''}`
    : null

  const heading = {
    stays: 'Nuova prenotazione ricevuta',
    bike: 'Nuovo noleggio ricevuto',
    restaurant: 'Nuova prenotazione tavolo',
    experience: 'Nuova prenotazione esperienza',
  }[d.type]

  const dateLabels = d.type === 'bike'
    ? { in: 'Ritiro', out: 'Restituzione' }
    : d.type === 'stays'
      ? { in: 'Check-in', out: 'Check-out' }
      : { in: 'Data', out: '' }

  const rows = [
    row('Codice', d.reservationCode),
    row('Struttura', d.entityName),
    row('Ospite', d.guestName),
    row('Email', d.guestEmail),
    d.guestPhone ? row('Telefono', d.guestPhone) : '',
    row(dateLabels.in, d.checkIn),
    dateLabels.out ? row(dateLabels.out, d.checkOut) : '',
    guestsLabel ? row('Ospiti', guestsLabel) : '',
    row('Totale', `${d.total} ${currency}`),
  ].filter(Boolean).join('')

  const requestsBlock = d.specialRequests
    ? `<div style="margin-top:24px;padding:16px;background-color:#fef3c7;border-radius:8px;border-left:3px solid #d97706;"><div style="font-size:11px;letter-spacing:1px;color:#92400e;font-weight:600;margin-bottom:4px;">RICHIESTE OSPITE</div><div style="font-size:14px;color:#1c1917;">${escapeHtml(d.specialRequests)}</div></div>`
    : ''

  const inner = `<h1 style="font-size:22px;margin:0 0 8px 0;color:#1c1917;font-weight:700;">${heading}</h1><p style="margin:0 0 24px 0;color:#44403c;">Hai ricevuto una nuova prenotazione su <strong>${escapeHtml(d.entityName)}</strong>. I dettagli qui sotto.</p><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse:collapse;">${rows}</table>${requestsBlock}<div style="margin-top:32px;"><table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td style="background-color:#0f766e;border-radius:8px;"><a href="${d.cmsUrl}" style="display:inline-block;padding:12px 24px;color:#ffffff;font-weight:600;text-decoration:none;font-size:14px;">Vedi nel CMS</a></td></tr></table></div>`
  return SHELL_OPEN + inner + SHELL_CLOSE
}

interface WelcomeData {
  ownerName: string
  tenantName: string
  loginUrl: string
}

export function renderWelcomeHtml(d: WelcomeData): string {
  const inner = `<h1 style="font-size:22px;margin:0 0 16px 0;color:#1c1917;font-weight:700;">Benvenuto su TouraCore!</h1><p style="margin:0 0 16px 0;color:#44403c;">Ciao ${escapeHtml(d.ownerName)},</p><p style="margin:0 0 24px 0;color:#44403c;">il tuo account <strong>${escapeHtml(d.tenantName)}</strong> è attivo. Hai 14 giorni di prova gratuita per esplorare tutte le funzionalità.</p><table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td style="background-color:#0f766e;border-radius:8px;"><a href="${d.loginUrl}" style="display:inline-block;padding:12px 24px;color:#ffffff;font-weight:600;text-decoration:none;font-size:14px;">Accedi al CMS</a></td></tr></table><div style="margin-top:32px;padding:20px;background-color:#fafaf9;border-radius:8px;"><div style="font-size:11px;letter-spacing:1px;color:#78716c;font-weight:600;margin-bottom:12px;">PROSSIMI PASSI</div><ol style="margin:0;padding-left:20px;color:#44403c;font-size:14px;line-height:1.8;"><li>Configura le tue strutture e le tariffe</li><li>Carica foto e descrizioni</li><li>Attiva il booking engine pubblico</li><li>Embed il widget sul tuo sito esistente (opzionale)</li></ol></div>`
  return SHELL_OPEN + inner + SHELL_CLOSE
}
