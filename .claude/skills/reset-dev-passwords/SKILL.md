---
name: reset-dev-passwords
description: Resetta la password di tutti gli account Supabase Auth del progetto TouraCore a un valore comune per testing in dev. Usalo quando l'utente chiede di resettare/unificare le password degli account dev, o di preparare gli account per test manuali/E2E. SOLO DEV.
---

# Reset Dev Passwords

Reset bulk password di tutti gli utenti Supabase Auth via Admin API. Solo progetto dev `dysnrgnqzliodqrsohoz`.

## Guardrail

- SOLO dev. Se l'utente non ha confermato dev, chiedi prima di procedere.
- Password default: `Test8979`. Se l'utente ne fornisce un'altra, usala.
- Mai eseguire in produzione o contro URL diverso da quello in `apps/web/.env.local` dev.
- Non committare mai la password in codice o log pubblici.

## Procedura

1. Conferma con l'utente password desiderata (default `Test8979`) e che siamo in dev.
2. Esegui il comando di reset bulk (legge env da `apps/web/.env.local`):

```bash
node --env-file=apps/web/.env.local -e "
(async()=>{
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  const pwd=process.env.RESET_PWD||'Test8979';
  const H={apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'};
  let page=1,all=[];
  while(true){
    const r=await fetch(url+'/auth/v1/admin/users?per_page=200&page='+page,{headers:H});
    const j=await r.json();
    if(!j.users||j.users.length===0)break;
    all=all.concat(j.users);
    if(j.users.length<200)break;
    page++;
  }
  let ok=0,fail=0,fails=[];
  for(const u of all){
    const r=await fetch(url+'/auth/v1/admin/users/'+u.id,{method:'PUT',headers:H,body:JSON.stringify({password:pwd})});
    if(r.ok)ok++;
    else{fail++;if(fails.length<5){const t=await r.text();fails.push({email:u.email,status:r.status,err:t.slice(0,200)});}}
  }
  console.log('TOTAL:',all.length,'OK:',ok,'FAIL:',fail);
  all.forEach(u=>console.log('-',u.email,'|',u.id));
  if(fails.length)console.log('FAILS',JSON.stringify(fails,null,2));
})();"
```

Per password custom: prefissa con `RESET_PWD='MyPass!'` prima di `node`.

## Output Atteso

- Totale utenti processati
- OK / FAIL count
- Lista email + id resettati
- Aggiorna `memory/test_credentials_e2e.md` se password cambia rispetto al valore memorizzato

## Fallback

Se `SUPABASE_SERVICE_ROLE_KEY` non legge o API risponde 401:
- Verifica chiave in `apps/web/.env.local` (deve essere service_role, non anon)
- Verifica che `NEXT_PUBLIC_SUPABASE_URL` punti al progetto dev atteso
