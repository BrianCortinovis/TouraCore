import { cookies } from 'next/headers'

const ENTITY_COOKIE = 'touracore_selected_entity'
const ONE_YEAR = 60 * 60 * 24 * 365

export async function syncSelectedEntity(entityId: string) {
  const store = await cookies()
  if (store.get(ENTITY_COOKIE)?.value === entityId) return
  store.set(ENTITY_COOKIE, entityId, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: ONE_YEAR,
  })
}
