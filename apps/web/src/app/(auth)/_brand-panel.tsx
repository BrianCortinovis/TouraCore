/**
 * Pannello brand TouraCore per pagine auth (login, register, forgot-password, reset-password).
 * Layout split-screen: brand sx (gradient blu) + form dx.
 */
export function BrandPanel() {
  return (
    <div className="hidden w-1/2 bg-gradient-to-br from-blue-600 to-blue-800 lg:flex lg:flex-col lg:items-center lg:justify-center lg:p-12">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm">
          <span className="text-3xl font-bold text-white">T</span>
        </div>
        <h1 className="text-4xl font-bold text-white">TouraCore</h1>
        <p className="mt-3 text-lg text-blue-100">
          Piattaforma multi-verticale per il turismo
        </p>
        <div className="mt-8 space-y-3 text-left text-sm text-blue-200">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-blue-300" />
            Hospitality, tour, bike rental, esperienze
          </div>
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-blue-300" />
            Booking engine e channel manager
          </div>
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-blue-300" />
            Gestione multi-struttura con agenzie e portali
          </div>
        </div>
      </div>
    </div>
  )
}

export function MobileBrandHeader() {
  return (
    <div className="mb-8 text-center lg:hidden">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600">
        <span className="text-xl font-bold text-white">T</span>
      </div>
      <h1 className="text-2xl font-bold text-gray-900">TouraCore</h1>
    </div>
  )
}
