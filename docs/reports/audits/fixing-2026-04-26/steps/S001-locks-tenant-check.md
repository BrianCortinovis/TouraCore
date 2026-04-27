# S001 — `locks/actions.ts` tenant ownership check

**Sprint:** 1
**Severity originale:** 🔴 Critical (sicurezza fisica)
**Effort stimato:** 2h
**Categoria:** auth scope cross-tenant
**Audit ref:** `docs/audit-2026-04-26/live-state.html` A1

## Bug

`apps/web/src/app/(app)/[tenantSlug]/stays/[entitySlug]/locks/actions.ts`

4 server action senza ownership check tenant:

- `createSmartLock` (line 21): controlla solo che `entity` esista, non che appartenga al tenant del caller. Permette ad un user di tenant A di salvare smart lock + config encrypted su entity di tenant B.
- `issueLockAccessCode` (line 55): nessun check su `lockId`. User può chiamare con `lockId` arbitrario, **decriptare la config Nuki/TTLock** del tenant target e generare PIN su API esterna.
- `revokeLockAccessCode` (line 102): stesso pattern, nessun check su `codeId`.
- `revokePinsForReservation` (line 115): chiamato da checkout flow, accetta `reservationId` arbitrario, decripta config altrui.

Impatto: sicurezza fisica delle strutture compromessa. PIN generati su porte di altre proprietà, config API decriptata.

## PRE-CHECK

```bash
grep -n "createSmartLock\|issueLockAccessCode" apps/web/src/app/(app)/\[tenantSlug\]/stays/\[entitySlug\]/locks/actions.ts | head
```

Se le funzioni NON contengono chiamata a `assertOwnsTenant` o equivalente check tenant → bug presente.

## APPLY

Aggiungere helper `assertOwnsTenantAndEntity(tenantSlug, entityId)` in cima al file, basato sul pattern già usato in `apps/web/src/app/(app)/[tenantSlug]/settings/loyalty/actions.ts:8`.

L'helper deve:
1. `getCurrentUser()` → 401 se assente
2. `tenants WHERE slug=$tenantSlug` → 404 se assente
3. Bypass se `platform_admins.user_id = caller`
4. Altrimenti `memberships WHERE user_id+tenant_id+is_active=true` → 403
5. `entities WHERE id=$entityId AND tenant_id=$tenantId` → 403 se entity non in tenant
6. Ritorna `{ tenantId, entityId }` validati

Modifiche per ogni funzione:

**`createSmartLock`**: chiamare `await assertOwnsTenantAndEntity(parsed.tenantSlug, parsed.entityId)` come prima riga dopo parse.

**`issueLockAccessCode`**: prima del decrypt, fare lookup smart_lock → entity_id → entity.tenant_id → match con `assertOwnsTenant(parsed.tenantSlug)` (perché parametro lockId è UUID puro).

**`revokeLockAccessCode`**: stesso lookup via `lock_access_codes.lock_id → smart_locks.entity_id → entities.tenant_id`.

**`revokePinsForReservation`**: questa è chiamata internamente da checkout flow (best-effort). Aggiungere parametro `tenantId` opzionale: se passato, validare ownership; se assente (chiamata server-to-server), procedere ma loggare. Per il chiamante esterno serve lookup `reservations.entity_id → entities.tenant_id`.

Vedi codice in steps/S001-patch.md per diff completo.

## POST-CHECK

```bash
# Verifica presenza assertOwnsTenant nelle 4 funzioni
grep -c "assertOwnsTenant" apps/web/src/app/(app)/\[tenantSlug\]/stays/\[entitySlug\]/locks/actions.ts
# Deve essere ≥ 4

# Lint+typecheck
bash docs/fixing-2026-04-26/scripts/verify.sh
```

E2E manuale (se environment dev pronto):
- Login come user villa-irabo
- Tentare `createSmartLock` con `entityId` di casa-vacanze-sole tenant
- Deve throw "Forbidden"

## COMMIT

```
fix(locks): tenant ownership check su 4 server action smart-lock

S001 — createSmartLock, issueLockAccessCode, revokeLockAccessCode, revokePinsForReservation usano ora assertOwnsTenantAndEntity (pattern uniforme con settings/loyalty). Bloccano cross-tenant decrypt config Nuki/TTLock e generazione PIN su porte fisiche di altre strutture.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## STATE UPDATE

```bash
bash docs/fixing-2026-04-26/scripts/state-update.sh S001 done <commit-hash> "tenant ownership applied to 4 actions"
```

## Rollback

```bash
git revert <commit-hash>
bash docs/fixing-2026-04-26/scripts/state-update.sh S001 pending
```
