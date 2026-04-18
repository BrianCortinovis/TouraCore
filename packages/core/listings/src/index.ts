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

// Generic vertical template (activity/wellness/moto/ski)
export { GenericVerticalTemplate } from './generic-vertical-template'
export type { GenericVerticalTemplateProps } from './generic-vertical-template'

// Bike rental vertical data
export {
  getBikeRentalDetails,
  getBikeTypesPublic,
  getBikeLocationsPublic,
  bikeRentalDetailsSchema,
  bikeTypePublicSchema,
  bikeLocationPublicSchema,
} from './bike-rental'
export type {
  BikeRentalDetails,
  BikeTypePublic,
  BikeLocationPublic,
  BikeRentalOpeningHours,
} from './bike-rental'
export { BikeRentalTemplate } from './bike-rental-template'
export type { BikeRentalTemplateProps } from './bike-rental-template'

// Photo gallery
export { getListingPhotos, listingPhotoSchema } from './photos'
export type { ListingPhoto } from './photos'
export { ListingGallery } from './gallery'
export type { ListingGalleryProps } from './gallery'

// Platform profile
export {
  BOOKING_MODES,
  getPlatformProfile,
  getProfileListings,
  platformProfileSchema,
  profileListingSchema,
} from './profile'
export type { BookingMode, PlatformProfile, ProfileListing } from './profile'
