import { describe, it, expect } from 'vitest';
import { renderPolicy, listPolicies } from './render';
import { POLICY_KEYS, SUPPORTED_LOCALES, type PolicyVars } from './types';

const testVars: PolicyVars = {
  brand: 'TouraCore',
  data_controller: 'TouraCore S.r.l.',
  established_address: 'Via Roma 1, 20100 Milano, Italia',
  contact_email: 'info@touracore.com',
  dpo_email: 'dpo@touracore.com',
  last_updated: '2026-04-19',
};

describe('renderPolicy', () => {
  it('renders all 4 policies x 2 locales', () => {
    for (const policy of POLICY_KEYS) {
      for (const locale of SUPPORTED_LOCALES) {
        const result = renderPolicy(policy, locale, testVars);
        expect(result.policy).toBe(policy);
        expect(result.locale).toBe(locale);
        expect(result.html).toContain('<h1');
        expect(result.markdown).not.toMatch(/\{\{[a-z_]+\}\}/);
        expect(result.version).toMatch(/^[a-f0-9]{16}$/);
      }
    }
  });

  it('substitutes all variables', () => {
    const result = renderPolicy('privacy', 'it', testVars);
    expect(result.markdown).toContain('TouraCore S.r.l.');
    expect(result.markdown).toContain('dpo@touracore.com');
    expect(result.markdown).toContain('2026-04-19');
    expect(result.markdown).not.toContain('{{brand}}');
    expect(result.markdown).not.toContain('{{data_controller}}');
  });

  it('parses frontmatter', () => {
    const result = renderPolicy('cookie', 'en', testVars);
    expect(result.frontmatter['title']).toBe('Cookie Policy');
    expect(result.frontmatter['locale']).toBe('en');
    expect(result.frontmatter['policy']).toBe('cookie');
    expect(result.title).toBe('Cookie Policy');
  });

  it('throws on missing required vars', () => {
    expect(() =>
      renderPolicy('privacy', 'it', { brand: 'X' } as PolicyVars)
    ).toThrow(/Missing required policy vars/);
  });

  it('throws on unknown policy', () => {
    expect(() =>
      // @ts-expect-error test invalid
      renderPolicy('unknown', 'it', testVars)
    ).toThrow(/Unknown policy/);
  });

  it('throws on unsupported locale', () => {
    expect(() =>
      // @ts-expect-error test invalid
      renderPolicy('privacy', 'fr', testVars)
    ).toThrow(/Unsupported locale/);
  });

  it('listPolicies returns 10 combinations (5 policy x 2 locale)', () => {
    const list = listPolicies();
    expect(list).toHaveLength(10);
  });

  it('GDPR articles referenced in privacy IT', () => {
    const result = renderPolicy('privacy', 'it', testVars);
    expect(result.markdown).toContain('Art. 6');
    expect(result.markdown).toContain('Artt. 15-22');
    expect(result.markdown).toContain('Garante');
  });

  it('Garante 2021 referenced in cookie policy', () => {
    const result = renderPolicy('cookie', 'it', testVars);
    expect(result.markdown).toContain('10 giugno 2021');
  });
});
