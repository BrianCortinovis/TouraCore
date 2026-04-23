# Architecture Guardrails

- Parti sempre dall'area piu locale possibile: route group, package o verticale impattato.
- Mantieni espliciti tenant scope ed entity scope.
- Non duplicare business logic importante dentro pagine o componenti se puo vivere in package condivisi.
- Le modifiche database passano da `supabase/migrations`.
- Non introdurre nuovi framework, pattern di stato o dipendenze senza una motivazione chiara.
- Per modifiche cross-package, fai prima un piano e rendi visibili impatto e rischi.

