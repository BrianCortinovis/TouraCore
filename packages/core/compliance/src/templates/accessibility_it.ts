export default `---
title: Dichiarazione di accessibilità
locale: it
policy: accessibility
---

# Dichiarazione di accessibilità

**Ultimo aggiornamento:** {{last_updated}}

Ai sensi della **Legge 9 gennaio 2004, n. 4 ("Legge Stanca")** e delle **Linee guida AgID**, {{data_controller}} si impegna a rendere {{brand}} accessibile, in conformità alla normativa nazionale e alle specifiche tecniche **WCAG 2.1 livello AA**.

## Stato di conformità

Questo sito è **parzialmente conforme** alle WCAG 2.1 livello AA. Le parti del contenuto che seguono non sono pienamente conformi per i motivi indicati nella sezione "Contenuti non accessibili".

## Contenuti non accessibili

I contenuti elencati di seguito non sono pienamente accessibili per i seguenti motivi:

- **Incompatibilità**: alcuni contenuti multimediali embeddati (video di terze parti, widget di prenotazione esterni) potrebbero non rispettare tutti i criteri WCAG.
- **Onere sproporzionato**: contenuti storici pre-2024 senza alt text potrebbero richiedere remediation progressiva.

## Redazione della dichiarazione

Questa dichiarazione è stata redatta il {{last_updated}}.

Metodologia: **autovalutazione** effettuata dal soggetto erogatore, integrata con tool automatici (axe-core, Lighthouse) e test manuale tastiera + screen reader NVDA.

## Feedback e contatti

Per segnalare casi di mancata conformità o richiedere formati alternativi:

- **Email:** {{contact_email}}
- **DPO:** {{dpo_email}}
- **Indirizzo:** {{established_address}}

Ti risponderemo entro **30 giorni**.

## Procedura di attuazione

In caso di risposta non soddisfacente, è possibile presentare segnalazione al **Difensore civico per il digitale** secondo le modalità previste dall'**Art. 3-quinquies L. 9/2004**.

## Informazioni tecniche

- **Tecnologie assistive testate:** NVDA (Windows), VoiceOver (macOS/iOS), TalkBack (Android)
- **Browser testati:** Chrome 130+, Firefox 131+, Safari 17+, Edge 130+
- **Standard di conformità:** WCAG 2.1 Livello AA + EN 301 549

---

*Versione template: {{policy_version}}*
`;
