import privacy_it from './privacy_it';
import privacy_en from './privacy_en';
import cookie_it from './cookie_it';
import cookie_en from './cookie_en';
import terms_it from './terms_it';
import terms_en from './terms_en';
import dpa_it from './dpa_it';
import dpa_en from './dpa_en';
import accessibility_it from './accessibility_it';
import accessibility_en from './accessibility_en';

export const TEMPLATES: Record<string, string> = {
  privacy_it,
  privacy_en,
  cookie_it,
  cookie_en,
  terms_it,
  terms_en,
  dpa_it,
  dpa_en,
  accessibility_it,
  accessibility_en,
};

// Sorted keys for deterministic hashing
export const TEMPLATE_KEYS = Object.keys(TEMPLATES).sort();
