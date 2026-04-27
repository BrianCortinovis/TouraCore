# Piano fixing TouraCore — 2026-04-26

Audit live: `docs/audit-2026-04-26/live-state.html` (88 finding totali, 11 critici reali).

## Garanzie operative

- **Atomicità**: ogni step è 1 commit Conventional Commits italiano.
- **Idempotenza**: ogni step ha PRE-CHECK che skippa se già applicato.
- **Resumable**: stato in `STATE.json` su disco. `resume.sh` riprende da primo `pending`.
- **Auto-doc**: `LOG.md` append-only con timestamp + commit hash + esito.
- **No data loss**: branch `fixing-2026-04-26` separato da main. Merge solo a fine.

## Branch e merge

- Branch: `fixing-2026-04-26` (creato da main HEAD `7771701`).
- Merge: dopo Sprint 1+2+3 completi e E2E full PASS.
- Strategia: fast-forward merge su main, no PR (memory: solo main).

## Verify policy

| Tipo | Frequenza |
|---|---|
| `pnpm lint` | ogni step |
| `pnpm typecheck` | ogni step |
| `pnpm test:unit` | ogni step se pacchetto compliance/billing toccato |
| `pnpm test:e2e` | fine di ogni Sprint |
| Chrome smoke (mcp chrome-devtools) | step rilevanti UI |
| Curl headers prod | step che toccano middleware/CSP |

## Sprint 1 — Critical reali (12 step, ~12h)

Stop production-blocking issues prima di tutto.

| Step | Titolo | Effort | Categoria |
|---|---|---|---|
| S001 | locks/actions.ts tenant ownership check | 2h | auth |
| S002 | (dashboard)/admin/actions.ts assertPlatformAdmin wrap | 1h | auth |
| S003 | pricing/actions.ts tenant check | 30min | auth |
| S004 | reviews/actions.ts tenant check | 30min | auth |
| S005 | messaggi/actions.ts tenant check | 30min | auth |
| S006 | rate-plans deleteRatePlan tenant check | 15min | auth |
| S007 | bundle checkout Connect split | 2h | billing |
| S008 | gift card Connect | 1h | billing |
| S009 | tassa soggiorno: amount server-side + Connect | 1.5h | billing |
| S010 | cron notifications-dispatch fail-closed | 5min | cron (smoke test) |
| S011 | INTEGRATIONS_ENCRYPTION_KEY no SR fallback | 30min | secrets |
| S012 | VOUCHER_JWT_SECRET no SR fallback | 30min | secrets |

Verify post-Sprint 1: `pnpm verify` + Chrome smoke `/`, `/discover`, `/login`.

## Sprint 2 — High (10 step, ~10h)

| Step | Titolo | Effort |
|---|---|---|
| S013 | MAGIC_LINK_SECRET separato da CRON_SECRET | 30min |
| S014 | Rate limiter migration a Vercel KV (o Upstash) | 2h |
| S015 | env.ts Zod schema fail-fast | 2h |
| S016 | Auth scope: settings/payments tenantSlug match | 30min |
| S017 | Auth scope: a/[agencySlug]/settings/stripe | 30min |
| S018 | Auth scope: settings/{modules,integrations,loyalty,legal-entities} (4 file) | 2h |
| S019 | Cron secret pattern unificato fail-closed (12+ file) | 1h |
| S020 | data-retention table_name whitelist | 30min |
| S021 | Webhook TheFork/Google/Octorate: secret per-restaurant + timingSafeEqual | 2h |
| S022 | superadmin-login: signIn DOPO check platform_admins | 30min |

Verify post-Sprint 2: `pnpm verify` + `pnpm test:e2e` + Chrome smoke auth flow.

## Sprint 3 — Headers + DB + Polish (8 step, ~10h)

| Step | Titolo | Effort |
|---|---|---|
| S023 | CSP nonce per script-src (rimuovere unsafe-inline) | 3h |
| S024 | frame-src + connect-src + img-src restringere | 1h |
| S025 | robots.txt path corretti (no route group, +disallow) | 15min |
| S026 | Migration 00151: schema_migrations backfill 56 entries | 1h |
| S027 | Migration 00152: view KPI security_invoker=true | 2h con test |
| S028 | vercel.json regions=fra1 + functions.maxDuration | 15min |
| S029 | Fix analytics 404 script obsoleto | 30min |
| S030 | Verify finale: full E2E + Chrome real + curl prod | 2h |

Verify post-Sprint 3: full E2E + Chrome 10 route + curl headers + Lighthouse.

## Stop & resume

```bash
# Riprendere fixing in qualsiasi momento (anche nuova chat):
cd /Users/briancortinovis/Documents/TouraCore
bash docs/fixing-2026-04-26/scripts/status.sh    # vedi avanzamento
bash docs/fixing-2026-04-26/scripts/resume.sh    # esegui prossimo step pending
```

Se nuova chat senza memoria sessione: legge `STATE.json`, ogni `steps/SXXX-*.md` è auto-contenuto con istruzioni complete.

## Rollback

Ogni step = 1 commit su `fixing-2026-04-26` branch. Rollback step N:
```bash
git revert <commit-hash-step-N>
# aggiorna STATE.json: SXXX → "pending"
```

Branch separato significa che main non è mai broken. In caso catastrofico:
```bash
git checkout main
git branch -D fixing-2026-04-26
# tutto il lavoro perso ma main intatto
```

## Critical path

S010 (fail-closed cron, 1 riga) → smoke test del sistema. Se questo passa, sistema fixing affidabile per gli altri 29 step.
