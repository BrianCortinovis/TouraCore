export interface JsonLdBase {
  '@context': 'https://schema.org';
  '@type': string;
}

export interface TouristDestinationLd extends JsonLdBase {
  '@type': 'TouristDestination';
  name: string;
  description?: string;
  url?: string;
  image?: string;
  geo?: {
    '@type': 'GeoCoordinates';
    latitude: number;
    longitude: number;
  };
  containsPlace?: LodgingBusinessLd[];
}

export interface LodgingBusinessLd extends JsonLdBase {
  '@type': 'LodgingBusiness';
  name: string;
  description?: string;
  url?: string;
  image?: string;
  address?: {
    '@type': 'PostalAddress';
    streetAddress?: string;
    addressLocality?: string;
    addressRegion?: string;
    postalCode?: string;
    addressCountry?: string;
  };
  starRating?: {
    '@type': 'Rating';
    ratingValue: number;
  };
  priceRange?: string;
}

export interface SeoInput {
  title: string;
  description?: string;
  keywords?: string[];
  ogImage?: string;
  canonicalUrl?: string;
  type?: 'website' | 'article';
  locale?: string;
}
