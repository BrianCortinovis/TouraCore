import { describe, it, expect, beforeEach } from 'vitest';
import {
  getPolicyVersion,
  getPolicyVersions,
  hashContent,
  _resetVersionCache,
} from './version';
import { POLICY_KEYS } from './types';

describe('version hash', () => {
  beforeEach(() => {
    _resetVersionCache();
  });

  it('returns 16-char hex string', () => {
    const v = getPolicyVersion();
    expect(v).toMatch(/^[a-f0-9]{16}$/);
  });

  it('is deterministic across calls', () => {
    _resetVersionCache();
    const v1 = getPolicyVersion();
    _resetVersionCache();
    const v2 = getPolicyVersion();
    expect(v1).toBe(v2);
  });

  it('returns per-policy versions for all 4 policies', () => {
    const versions = getPolicyVersions();
    for (const policy of POLICY_KEYS) {
      expect(versions[policy]).toMatch(/^[a-f0-9]{16}$/);
    }
  });

  it('different policies have different hashes', () => {
    const versions = getPolicyVersions();
    const values = Object.values(versions);
    const unique = new Set(values);
    expect(unique.size).toBe(values.length);
  });

  it('hashContent is stable + collision-resistant', () => {
    expect(hashContent('abc')).toBe(hashContent('abc'));
    expect(hashContent('abc')).not.toBe(hashContent('abd'));
    expect(hashContent('')).toMatch(/^[a-f0-9]{16}$/);
  });
});
