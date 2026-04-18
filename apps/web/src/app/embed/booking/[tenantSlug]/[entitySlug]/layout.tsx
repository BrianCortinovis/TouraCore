export const metadata = { robots: { index: false } }

export default function EmbedBookingLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body style={{ margin: 0, background: 'transparent' }}>{children}</body>
    </html>
  )
}
