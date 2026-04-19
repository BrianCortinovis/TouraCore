import { createHash } from 'node:crypto';
import { TEMPLATES, TEMPLATE_KEYS } from './templates/_index';
import { POLICY_KEYS, SUPPORTED_LOCALES, type PolicyKey } from './types';

let _cachedVersion: string | null = null;
let _cachedPerPolicy: Record<PolicyKey, string> | null = null;

function hashContent(content: string): string {
  return createHash('sha256').update(content).digest('hex').slice(0, 16);
}

// Deterministic hash across all templates — sorted file list
export function getPolicyVersion(): string {
  if (_cachedVersion) return _cachedVersion;

  const hasher = createHash('sha256');
  for (const key of TEMPLATE_KEYS) {
    const content = TEMPLATES[key]!;
    hasher.update(key);
    hasher.update('\0');
    hasher.update(content);
    hasher.update('\0');
  }
  _cachedVersion = hasher.digest('hex').slice(0, 16);
  return _cachedVersion;
}

// Per-policy hash aggregating all locales
export function getPolicyVersions(): Record<PolicyKey, string> {
  if (_cachedPerPolicy) return _cachedPerPolicy;

  const out = {} as Record<PolicyKey, string>;
  for (const policy of POLICY_KEYS) {
    const hasher = createHash('sha256');
    for (const locale of SUPPORTED_LOCALES) {
      const key = `${policy}_${locale}`;
      const content = TEMPLATES[key]!;
      hasher.update(locale);
      hasher.update('\0');
      hasher.update(content);
      hasher.update('\0');
    }
    out[policy] = hasher.digest('hex').slice(0, 16);
  }
  _cachedPerPolicy = out;
  return out;
}

export function _resetVersionCache(): void {
  _cachedVersion = null;
  _cachedPerPolicy = null;
}

export { hashContent };
