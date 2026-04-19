// Additional schema.org builders: Breadcrumb, FAQ, Review, Event, Organization, Website

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export function buildBreadcrumbLd(items: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export interface FAQ {
  question: string;
  answer: string;
}

export function buildFAQLd(faqs: FAQ[]) {
  if (faqs.length < 3) return null; // Google rich results guideline
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: f.answer,
      },
    })),
  };
}

export interface Review {
  author: string;
  ratingValue: number;
  reviewBody?: string;
  datePublished: string; // ISO
  bestRating?: number;
  worstRating?: number;
}

export function buildReviewLd(review: Review) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Review',
    author: { '@type': 'Person', name: review.author },
    datePublished: review.datePublished,
    reviewRating: {
      '@type': 'Rating',
      ratingValue: review.ratingValue,
      bestRating: review.bestRating ?? 5,
      worstRating: review.worstRating ?? 1,
    },
    reviewBody: review.reviewBody,
  };
}

export function buildAggregateRatingLd(params: {
  ratingValue: number;
  reviewCount: number;
  bestRating?: number;
  worstRating?: number;
}) {
  return {
    '@type': 'AggregateRating',
    ratingValue: params.ratingValue,
    reviewCount: params.reviewCount,
    bestRating: params.bestRating ?? 5,
    worstRating: params.worstRating ?? 1,
  };
}

export interface EventOffer {
  price: number;
  currency: string;
  availability?: 'InStock' | 'SoldOut' | 'LimitedAvailability';
  url?: string;
  validFrom?: string;
}

export interface EventLdInput {
  name: string;
  description?: string;
  startDate: string; // ISO
  endDate?: string;
  url?: string;
  image?: string;
  eventStatus?: 'EventScheduled' | 'EventCancelled' | 'EventPostponed' | 'EventRescheduled';
  eventAttendanceMode?: 'OfflineEventAttendanceMode' | 'OnlineEventAttendanceMode' | 'MixedEventAttendanceMode';
  location?: {
    name: string;
    address?: string;
    lat?: number;
    lng?: number;
  };
  organizer?: { name: string; url?: string };
  offers?: EventOffer[];
  performer?: string;
  maximumAttendeeCapacity?: number;
}

export function buildEventLd(input: EventLdInput) {
  const ld: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: input.name,
    description: input.description,
    startDate: input.startDate,
    endDate: input.endDate,
    url: input.url,
    image: input.image,
    eventStatus: `https://schema.org/${input.eventStatus ?? 'EventScheduled'}`,
    eventAttendanceMode: `https://schema.org/${input.eventAttendanceMode ?? 'OfflineEventAttendanceMode'}`,
  };

  if (input.location) {
    ld['location'] = {
      '@type': 'Place',
      name: input.location.name,
      address: input.location.address,
      ...(input.location.lat !== undefined && input.location.lng !== undefined
        ? {
            geo: {
              '@type': 'GeoCoordinates',
              latitude: input.location.lat,
              longitude: input.location.lng,
            },
          }
        : {}),
    };
  }

  if (input.organizer) {
    ld['organizer'] = {
      '@type': 'Organization',
      name: input.organizer.name,
      url: input.organizer.url,
    };
  }

  if (input.performer) {
    ld['performer'] = { '@type': 'Person', name: input.performer };
  }

  if (input.maximumAttendeeCapacity !== undefined) {
    ld['maximumAttendeeCapacity'] = input.maximumAttendeeCapacity;
  }

  if (input.offers?.length) {
    ld['offers'] = input.offers.map((o) => ({
      '@type': 'Offer',
      price: o.price,
      priceCurrency: o.currency,
      availability: `https://schema.org/${o.availability ?? 'InStock'}`,
      url: o.url,
      validFrom: o.validFrom,
    }));
  }

  return ld;
}

export interface OrganizationLdInput {
  name: string;
  url: string;
  logo?: string;
  sameAs?: string[];
  description?: string;
  contactPoint?: {
    email?: string;
    telephone?: string;
    contactType?: string;
  };
}

export function buildOrganizationLd(input: OrganizationLdInput) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: input.name,
    url: input.url,
    logo: input.logo,
    description: input.description,
    sameAs: input.sameAs,
    ...(input.contactPoint
      ? {
          contactPoint: {
            '@type': 'ContactPoint',
            email: input.contactPoint.email,
            telephone: input.contactPoint.telephone,
            contactType: input.contactPoint.contactType ?? 'customer support',
          },
        }
      : {}),
  };
}

export interface WebsiteLdInput {
  name: string;
  url: string;
  searchUrlTemplate?: string; // e.g. "https://x.com/discover?q={search_term_string}"
}

export function buildWebsiteLd(input: WebsiteLdInput) {
  const ld: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: input.name,
    url: input.url,
  };
  if (input.searchUrlTemplate) {
    ld['potentialAction'] = {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: input.searchUrlTemplate,
      },
      'query-input': 'required name=search_term_string',
    };
  }
  return ld;
}
