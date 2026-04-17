import { createServerSupabaseClient } from '@touracore/db/server'
import { InboxView } from './inbox-view'

interface Props {
  params: Promise<{ tenantSlug: string; entitySlug: string }>
  searchParams: Promise<{ thread?: string }>
}

export default async function InboxPage({ params, searchParams }: Props) {
  const { tenantSlug, entitySlug } = await params
  const { thread: threadId } = await searchParams
  const supabase = await createServerSupabaseClient()

  const { data: entity } = await supabase.from('entities').select('id, name').eq('slug', entitySlug).single()
  if (!entity) return null

  const { data: threads } = await supabase
    .from('message_threads')
    .select('id, channel, subject, last_message_at, status, unread_count, guest_id, reservation_id')
    .eq('entity_id', entity.id)
    .eq('status', 'open')
    .order('last_message_at', { ascending: false })
    .limit(100)

  let messages: Array<{ id: string; direction: string; sender_name: string | null; body: string; sent_at: string; read_at: string | null }> = []
  if (threadId) {
    const { data } = await supabase
      .from('thread_messages')
      .select('id, direction, sender_name, body, sent_at, read_at')
      .eq('thread_id', threadId)
      .order('sent_at')
    messages = (data ?? []) as never
  }

  return (
    <div className="h-[calc(100vh-3.5rem)] p-6">
      <header className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Inbox</h1>
        <p className="text-sm text-gray-500">Messaggi unificati: email · widget · channel chat</p>
      </header>
      <InboxView
        tenantSlug={tenantSlug}
        entitySlug={entitySlug}
        threads={(threads ?? []).map((t) => ({
          id: t.id as string,
          channel: t.channel as string,
          subject: t.subject as string | null,
          lastMessageAt: t.last_message_at as string,
          unreadCount: t.unread_count as number,
          guestId: t.guest_id as string | null,
          reservationId: t.reservation_id as string | null,
        }))}
        activeThreadId={threadId ?? null}
        messages={messages.map((m) => ({
          id: m.id,
          direction: m.direction as 'inbound' | 'outbound',
          senderName: m.sender_name,
          body: m.body,
          sentAt: m.sent_at,
        }))}
      />
    </div>
  )
}
