import type { FC } from 'react'
import { AMENITIES } from './amenities'
import type { AmenityKey } from './types'

export type AmenityIconProps = {
  amenity: AmenityKey
  size?: number
  className?: string
  strokeWidth?: number
}

export const AmenityIcon: FC<AmenityIconProps> = ({
  amenity,
  size = 20,
  className,
  strokeWidth = 2,
}) => {
  const Icon = AMENITIES[amenity].icon
  return <Icon size={size} className={className} strokeWidth={strokeWidth} />
}
