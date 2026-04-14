import type { JsonLdBase } from './types';

export function JsonLdScript({ data }: { data: JsonLdBase }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
