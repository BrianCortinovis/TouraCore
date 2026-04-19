---
title: Data Processing Agreement (DPA)
locale: it
policy: dpa
---

# Accordo sul Trattamento dei Dati (DPA)

**Ultimo aggiornamento:** {{last_updated}}

Il presente DPA è parte integrante dei Termini di Servizio e disciplina il trattamento di dati personali ex Art. 28 GDPR tra {{data_controller}} ("Responsabile") e il Tenant ("Titolare").

## 1. Ruoli

- **Titolare del trattamento:** il Tenant, per i dati dei propri clienti/ospiti.
- **Responsabile del trattamento:** {{data_controller}}, che elabora i dati per conto del Titolare.
- **Sub-responsabili:** elencati in [/legal/sub-processors](/legal/sub-processors).

## 2. Oggetto e finalità

Il Responsabile elabora dati personali per le finalità di erogazione del servizio SaaS: gestione prenotazioni, fatturazione, comunicazioni, storage, backup.

## 3. Categorie di dati

- Dati di contatto ospiti (nome, email, telefono)
- Dati di prenotazione (date, importi)
- Documenti di identità quando caricati dal Titolare
- Dati di pagamento tokenizzati

## 4. Durata

La durata del DPA coincide con la durata del contratto di servizio.

## 5. Obblighi del Responsabile

Il Responsabile si impegna a:

1. Trattare i dati solo su istruzioni documentate del Titolare.
2. Garantire riservatezza del personale autorizzato (NDA interni).
3. Adottare misure di sicurezza ex Art. 32 GDPR (crittografia AES-256-GCM, TLS 1.3, RLS, audit log).
4. Notificare violazioni entro 72h dalla scoperta.
5. Assistere il Titolare su DPIA, DSAR, rapporti con autorità di controllo.
6. Al termine del contratto: restituire o cancellare i dati (a scelta del Titolare) entro 30 giorni.

## 6. Sub-responsabili

Il Responsabile utilizza i sub-responsabili elencati in [/legal/sub-processors](/legal/sub-processors). Modifiche alla lista sono notificate 30 giorni prima via email. Il Titolare può obiettare con effetto di recesso se l'obiezione è motivata.

## 7. Trasferimenti extra-UE

Trasferimenti solo verso paesi con decisione di adeguatezza o sulla base di Standard Contractual Clauses (SCC Decisione UE 2021/914).

## 8. Audit

Il Titolare può richiedere audit annuale al Responsabile con preavviso di 30 giorni, a spese del Titolare. Report SOC 2 o ISO 27001, se disponibili, soddisfano l'obbligo di audit.

## 9. Sicurezza

Misure tecniche e organizzative: crittografia at-rest/in-transit, access control RBAC+RLS, MFA amministratori, backup giornalieri cifrati, penetration test annuale, DPIA su nuovi trattamenti.

## 10. Contatti

**Responsabile:** {{data_controller}} — {{contact_email}}
**DPO Responsabile:** {{dpo_email}}

---

*Versione template: {{policy_version}}*
