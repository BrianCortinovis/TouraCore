#!/usr/bin/env node
// Genera 11 file MP3 voice-over via OpenAI TTS API.
// Uso: OPENAI_API_KEY=sk-... node generate-audio.mjs
//
// Modello: tts-1-hd (qualità superiore)
// Voce: nova (femminile italiana naturale, professionale)
// Output: docs/billing/presentation/audio/{00..10}-*.mp3

import { writeFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const AUDIO_DIR = join(__dirname, 'audio')

const NARRATIONS = [
  {
    file: '00-cover.mp3',
    text: 'Ciao, sono qui per spiegarti in pochi minuti come funzionano i pagamenti su TouraCore. Ti mostrerò perché siamo diversi dalle altre piattaforme turistiche. Premi avanti quando sei pronto.',
  },
  {
    file: '01-problema.mp3',
    text: 'Il problema delle piattaforme tradizionali è semplice. Quando un cliente prenota, i soldi vanno prima alla piattaforma. Poi, dopo trenta o sessanta giorni, vengono girati a te. Tu di fatto presti soldi a Booking o Airbnb. Su TouraCore questo non succede.',
  },
  {
    file: '02-big-number.mp3',
    text: 'Zero euro. Mai un euro del tuo cliente passa per il nostro conto. Tutto va direttamente sul tuo Stripe, e da lì sul tuo IBAN, ogni giorno via bonifico SEPA automatico.',
  },
  {
    file: '03-flusso.mp3',
    text: 'Funziona così. Il cliente fa una sola transazione carta. Stripe, alla fonte, splitta i soldi in due. Novecento euro vanno direttamente al tuo conto. Cento euro alla nostra commissione. Una sola operazione, due destinatari, zero passaggi manuali.',
  },
  {
    file: '04-attori.mp3',
    text: 'Ci sono tre attori. Il cliente paga e basta, vede una sola transazione. Tu, il partner, ricevi direttamente sul tuo conto bancario. TouraCore prende solo la commissione concordata. Trasparente e immediato.',
  },
  {
    file: '05-tariffe.mp3',
    text: 'Hai quattro modi di farti pagare. Cancellazione gratuita è il default, perfetto per la maggior parte dei casi. La carta viene salvata, l addebito parte sette giorni prima del check-in. Acconto trenta per cento se vuoi cash flow garantito. Parzialmente rimborsabile come compromesso. Non rimborsabile per offerte scontate.',
  },
  {
    file: '06-timeline.mp3',
    text: 'Ecco un esempio realistico. Cliente prenota sei mesi prima. Niente viene addebitato. Per cinque mesi tutto è in attesa. Stripe gestisce in automatico carte scadute. A sette giorni dal check-in, parte l addebito automatico. Al check-in, tu fai capture e i soldi vengono splittati. Se il cliente cancella prima, zero refund da gestire perché niente è mai stato spostato.',
  },
  {
    file: '07-fail.mp3',
    text: 'Cosa succede se la carta del cliente fallisce. Il sistema ha quattro livelli di recupero. Prima riprova quattro volte ogni ventiquattro ore. Poi manda email al cliente con un link sicuro per aggiornare la carta tramite la dashboard Stripe nativa. Stripe ha anche un Card Updater che rinnova automatico le carte scadute. Se nulla funziona, la prenotazione viene cancellata automaticamente e lo slot liberato.',
  },
  {
    file: '08-stripe.mp3',
    text: 'Perché Stripe. Perché l ottanta per cento del lavoro è già fatto. PCI compliance, tre DS Italia, Card Updater, gestione refund e dispute, payout SEPA giornaliero, customer portal per i clienti. Tutto incluso. Noi ci occupiamo solo dell orchestrazione e della logica business specifica del turismo.',
  },
  {
    file: '09-onboarding.mp3',
    text: 'Per partire ti servono cinque minuti. Primo, registri il tuo account TouraCore. Secondo, vai in impostazioni pagamenti e clicchi collega Stripe, inserisci IBAN e documento. Terzo, scegli quali tariffe offrire. Pronto, puoi pubblicare e ricevere prenotazioni. I soldi ti arrivano sul conto via SEPA giornaliero.',
  },
  {
    file: '10-finale.mp3',
    text: 'Riassumendo. Tu incassi. Noi mai. TouraCore è la prima piattaforma turistica italiana che usa Stripe Connect Direct Charge end-to-end. I tuoi soldi sono tuoi dal secondo zero. Per qualsiasi domanda, scrivici. Grazie per l attenzione.',
  },
]

async function generateOne(apiKey, item) {
  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'tts-1-hd',
      input: item.text,
      voice: 'nova',
      response_format: 'mp3',
      speed: 1.0,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`OpenAI TTS failed for ${item.file}: ${res.status} ${err.slice(0, 200)}`)
  }

  const buffer = Buffer.from(await res.arrayBuffer())
  const path = join(AUDIO_DIR, item.file)
  await writeFile(path, buffer)
  return { file: item.file, sizeKb: Math.round(buffer.length / 1024) }
}

async function main() {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    console.error('❌ OPENAI_API_KEY non impostata')
    console.error('Uso: OPENAI_API_KEY=sk-... node generate-audio.mjs')
    process.exit(1)
  }

  await mkdir(AUDIO_DIR, { recursive: true })

  console.log(`🎙  Generating ${NARRATIONS.length} TTS files via OpenAI tts-1-hd / nova\n`)

  for (const item of NARRATIONS) {
    process.stdout.write(`  → ${item.file} ... `)
    try {
      const r = await generateOne(apiKey, item)
      console.log(`✓ ${r.sizeKb} KB`)
    } catch (err) {
      console.log(`✗ ${err.message}`)
    }
  }

  console.log('\n✅ Done. Apri docs/billing/presentation/index.html per testare.')
}

main()
