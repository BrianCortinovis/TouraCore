import { CmsSidebar } from '../../cms-sidebar'

export default async function CmsPropertyLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ entityId: string }>
}) {
  const { entityId } = await params

  return (
    <div className="flex h-screen bg-gray-50">
      <CmsSidebar entityId={entityId} />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-6 py-8">
          {children}
        </div>
      </main>
    </div>
  )
}
