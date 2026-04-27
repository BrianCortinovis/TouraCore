# Fixing log — 2026-04-26

Append-only. Ogni riga = 1 evento.

Format: `YYYY-MM-DD HH:MM:SS UTC | STEP | event | details`

## Eventi

```
2026-04-26 14:30:00 UTC | INIT | Branch fixing-2026-04-26 creato da main 7771701
2026-04-26 14:30:00 UTC | INIT | PLAN.md scritto, 30 step
2026-04-26 14:30:00 UTC | INIT | STATE.json inizializzato
```
2026-04-26 14:19:59 UTC | S010 | done | commit=ffb3903 | fail-closed pattern applied
2026-04-26 14:20:55 UTC | S001 | in_progress | started
2026-04-26 14:22:24 UTC | S001 | done | commit=694dce9 | tenant ownership applied to 4 actions
2026-04-26 14:23:34 UTC | S002 | done | commit=6c90649 | 9 actions wrapped requirePlatformAdmin
2026-04-26 14:24:19 UTC | S003 | done | commit=6adb9c9 | 5 actions tenant-scoped
2026-04-26 14:24:47 UTC | S004 | done | commit=e96d1a6 | 3 review actions tenant-scoped
2026-04-26 14:25:47 UTC | S005 | done | commit=eb6f506 | 3 messaggi actions tenant-scoped
2026-04-26 14:27:06 UTC | S006 | done | commit=93b5ce3 | table fix + tenant ownership
2026-04-26 14:27:58 UTC | S011 | done | commit=f2b31eb | fail-closed prod + dev warning
2026-04-26 14:28:25 UTC | S012 | done | commit=b6305b7 | fail-closed prod + dev warning
2026-04-26 14:38:32 UTC | S007 | done | commit=80961c3 | Connect split applied (price recompute deferred)
2026-04-26 14:39:26 UTC | S008 | done | commit=1d25428 | Connect split applied
2026-04-26 14:41:34 UTC | S009 | done | commit=40af1de | amount recompute + Connect split
2026-04-26 14:42:41 UTC | S013 | done | commit=7a93f0c | secret separation prod
2026-04-26 14:42:49 UTC | S014 | skipped | richiede setup Vercel KV/Upstash + env. Fuori scope code-only. Riprendere quando infra ready
2026-04-26 14:43:31 UTC | S015 | done | commit=e42378f | Zod schema fail-fast added
2026-04-26 14:45:03 UTC | S016 | done | commit=63dac50 | tenant ownership match on 3 actions
2026-04-26 14:45:34 UTC | S017 | done | commit=48a8fe7 | agency ownership match
2026-04-26 14:48:12 UTC | S018 | done | commit=1de51e9 | 4 settings tenant scope hardened
2026-04-26 14:48:54 UTC | S019 | skipped | tutti i cron già fail-closed (verificato grep). S010 ha fixato l'unico vulnerabile (notifications-dispatch)
2026-04-26 14:49:25 UTC | S020 | done | commit=6ff0223 | table+column whitelist added
2026-04-26 14:50:07 UTC | S021 | done | commit=11d3f61 | octorate timingSafeEqual
2026-04-26 14:51:02 UTC | S022 | done | commit=dfaadbf | globally revoke session on non-admin
2026-04-26 14:51:14 UTC | S023 | skipped | richiede refactor pesante middleware + propagazione nonce su tutti <Script>. Da affrontare in PR dedicata
2026-04-26 14:51:44 UTC | S024 | done | commit=9576cad | CSP tightened img+connect+frame
2026-04-26 14:52:28 UTC | S025 | done | commit=d103c58 | robots disallow corretti
2026-04-26 14:52:39 UTC | S026 | skipped | drift schema_migrations: backfill 56 entries è op DB invasiva. Non bug funzionale, da affrontare in finestra manutenzione coordinata
2026-04-26 14:53:28 UTC | S027 | done | commit=e97b005 | 9 KPI views invoker mode applied cloud
2026-04-26 14:53:47 UTC | S028 | done | commit=1d7509e | fra1 region + maxDuration applied
2026-04-26 14:54:54 UTC | S029 | skipped | 404 era Vercel Analytics anti-adblock fallback (atteso). Path /29459007106a3c15/script.js carica 200, /ac54f900c99dbdee/script.js è probe ad-blocker. Non è bug nel codice
2026-04-26 14:55:34 UTC | S030 | done | lint+typecheck PASS finale (17/17, 0 errors)
