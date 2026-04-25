import Link from 'next/link'
import Image from 'next/image'
import type { RoomType } from '@touracore/hospitality/src/types/database'

const CATEGORY_LABELS: Record<string, string> = {
  room: 'Camera',
  apartment: 'Appartamento',
  suite: 'Suite',
  studio: 'Studio',
  villa: 'Villa',
}

export function RoomTypeCard({ roomType, slug }: { roomType: RoomType; slug: string }) {
  return (
    <div className="flex gap-4 rounded-xl border border-gray-200 p-4">
      {roomType.photos?.[0] && (
        <Image
          src={roomType.photos[0]}
          alt={roomType.name}
          className="h-28 w-40 flex-shrink-0 rounded-lg object-cover"
          width={160}
          height={112}
          sizes="160px"
        />
      )}
      <div className="flex flex-1 flex-col justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900">{roomType.name}</h3>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
              {CATEGORY_LABELS[roomType.category] || roomType.category}
            </span>
          </div>
          {roomType.description && (
            <p className="mt-1 text-sm text-gray-500 line-clamp-2">{roomType.description}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-600">
            <span>Max {roomType.max_occupancy} ospiti</span>
            {roomType.size_sqm && <span>{roomType.size_sqm} mq</span>}
            {roomType.bed_configuration && <span>{roomType.bed_configuration}</span>}
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <p className="text-lg font-bold text-gray-900">
            €{roomType.base_price.toFixed(2)} <span className="text-sm font-normal text-gray-500">/ notte</span>
          </p>
          <Link
            href={`/book/${slug}`}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Prenota
          </Link>
        </div>
      </div>
    </div>
  )
}
