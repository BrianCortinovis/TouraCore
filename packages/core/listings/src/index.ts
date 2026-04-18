// Types + schemas
export {
  ENTITY_KINDS,
  AMENITY_KEYS,
  publicListingSchema,
  filterKnownAmenities,
} from './types'
export type { EntityKind, AmenityKey, PublicListing } from './types'

// Amenity catalog + icon
export { AMENITIES, getAmenity, getAmenityLabel } from './amenities'
export type { AmenityDescriptor } from './amenities'
export { AmenityIcon } from './amenity-icon'
export type { AmenityIconProps } from './amenity-icon'

// Queries + URL helpers
export {
  getListingUrl,
  getBookingUrl,
  getPublicListing,
  listTenantPublicListings,
  listAllPublicListings,
} from './queries'
export type { GetListingUrlOptions } from './queries'

// Shell component
export { ListingShell } from './shell'
export type { ListingShellProps, ListingLocale } from './shell'

// Schema.org / JSON-LD
export { buildListingJsonLd, getSchemaType } from './json-ld'
export type { ListingJsonLd } from './json-ld'

// Accommodation vertical data
export {
  getAccommodationDetails,
  accommodationDetailsSchema,
  normalizeAmenityKey,
  normalizeAmenities,
  formatPropertyType,
} from './accommodation'
export type { AccommodationDetails } from './accommodation'
export { HospitalityTemplate } from './hospitality-template'
export type { HospitalityTemplateProps } from './hospitality-template'

// Restaurant vertical data
export {
  getRestaurantDetails,
  restaurantDetailsSchema,
  WEEKDAY_KEYS,
  getWeekdayLabel,
  getWeekdaySchemaOrg,
  formatOpeningSlots,
  formatCuisineTag,
  formatPriceRange,
} from './restaurant'
export type {
  RestaurantDetails,
  OpeningSlot,
  OpeningHours,
  WeekdayKey,
} from './restaurant'
export { RestaurantTemplate } from './restaurant-template'
export type { RestaurantTemplateProps } from './restaurant-template'
