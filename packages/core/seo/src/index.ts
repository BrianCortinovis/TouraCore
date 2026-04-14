import type { Metadata } from 'next';
import type {
  SeoInput,
  TouristDestinationLd,
  LodgingBusinessLd,
} from './types';

export type {
  SeoInput,
  JsonLdBase,
  TouristDestinationLd,
  LodgingBusinessLd,
} from './types';

export { JsonLdScript } from './json-ld-script';

export function buildMetadata(input: SeoInput): Metadata {
  const metadata: Metadata = {
    title: input.title,
    description: input.description,
    keywords: input.keywords,
    openGraph: {
      title: input.title,
      description: input.description,
      type: input.type ?? 'website',
      locale: input.locale ?? 'it_IT',
      ...(input.ogImage ? { images: [{ url: input.ogImage }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: input.title,
      description: input.description,
    },
    ...(input.canonicalUrl ? { alternates: { canonical: input.canonicalUrl } } : {}),
  };

  return metadata;
}

export function buildTouristDestinationLd(params: {
  name: string;
  description?: string;
  url?: string;
  image?: string;
  lat?: number;
  lng?: number;
  properties?: Array<{
    name: string;
    description?: string;
    url?: string;
    image?: string;
    stars?: number;
  }>;
}): TouristDestinationLd {
  const ld: TouristDestinationLd = {
    '@context': 'https://schema.org',
    '@type': 'TouristDestination',
    name: params.name,
    description: params.description,
    url: params.url,
    image: params.image,
  };

  if (params.lat !== undefined && params.lng !== undefined) {
    ld.geo = {
      '@type': 'GeoCoordinates',
      latitude: params.lat,
      longitude: params.lng,
    };
  }

  if (params.properties?.length) {
    ld.containsPlace = params.properties.map((p) => ({
      '@context': 'https://schema.org' as const,
      '@type': 'LodgingBusiness' as const,
      name: p.name,
      description: p.description,
      url: p.url,
      image: p.image,
      ...(p.stars ? { starRating: { '@type': 'Rating' as const, ratingValue: p.stars } } : {}),
    }));
  }

  return ld;
}

export function buildLodgingBusinessLd(params: {
  name: string;
  description?: string;
  url?: string;
  image?: string;
  stars?: number;
  address?: {
    street?: string;
    city?: string;
    province?: string;
    zip?: string;
    country?: string;
  };
  priceRange?: string;
}): LodgingBusinessLd {
  const ld: LodgingBusinessLd = {
    '@context': 'https://schema.org',
    '@type': 'LodgingBusiness',
    name: params.name,
    description: params.description,
    url: params.url,
    image: params.image,
    priceRange: params.priceRange,
  };

  if (params.address) {
    ld.address = {
      '@type': 'PostalAddress',
      streetAddress: params.address.street,
      addressLocality: params.address.city,
      addressRegion: params.address.province,
      postalCode: params.address.zip,
      addressCountry: params.address.country ?? 'IT',
    };
  }

  if (params.stars) {
    ld.starRating = { '@type': 'Rating', ratingValue: params.stars };
  }

  return ld;
}
