import { marked } from 'marked';
import Mustache from 'mustache';
import { TEMPLATES } from './templates/_index';
import { getPolicyVersion } from './version';
import {
  POLICY_KEYS,
  SUPPORTED_LOCALES,
  type Locale,
  type PolicyKey,
  type PolicyVars,
  type RenderedPolicy,
} from './types';

const REQUIRED_VARS: Array<keyof PolicyVars> = [
  'brand',
  'data_controller',
  'established_address',
  'contact_email',
  'dpo_email',
  'last_updated',
];

function loadTemplate(policy: PolicyKey, locale: Locale): string {
  const key = `${policy}_${locale}`;
  const raw = TEMPLATES[key];
  if (!raw) {
    throw new Error(`Template not found: ${key}`);
  }
  return raw;
}

function parseFrontmatter(raw: string): {
  frontmatter: Record<string, string>;
  body: string;
} {
  if (!raw.startsWith('---\n')) {
    return { frontmatter: {}, body: raw };
  }
  const end = raw.indexOf('\n---\n', 4);
  if (end === -1) return { frontmatter: {}, body: raw };

  const fmBlock = raw.slice(4, end);
  const body = raw.slice(end + 5);
  const fm: Record<string, string> = {};

  for (const line of fmBlock.split('\n')) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    fm[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }

  return { frontmatter: fm, body };
}

function validateVars(vars: Partial<PolicyVars>): void {
  const missing = REQUIRED_VARS.filter((k) => !vars[k]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required policy vars: ${missing.join(', ')}`
    );
  }
}

export function renderPolicy(
  policy: PolicyKey,
  locale: Locale,
  vars: PolicyVars
): RenderedPolicy {
  if (!POLICY_KEYS.includes(policy)) {
    throw new Error(`Unknown policy: ${policy}`);
  }
  if (!SUPPORTED_LOCALES.includes(locale)) {
    throw new Error(`Unsupported locale: ${locale}`);
  }

  validateVars(vars);

  const raw = loadTemplate(policy, locale);
  const { frontmatter, body } = parseFrontmatter(raw);

  const version = vars.policy_version ?? getPolicyVersion();
  const rendered = Mustache.render(body, { ...vars, policy_version: version });
  const html = marked.parse(rendered, { async: false }) as string;

  return {
    policy,
    locale,
    title: frontmatter['title'] ?? policy,
    markdown: rendered,
    html,
    version,
    frontmatter,
  };
}

export function listPolicies(): Array<{ policy: PolicyKey; locale: Locale }> {
  const out: Array<{ policy: PolicyKey; locale: Locale }> = [];
  for (const policy of POLICY_KEYS) {
    for (const locale of SUPPORTED_LOCALES) {
      out.push({ policy, locale });
    }
  }
  return out;
}

export function _resetTemplateCache(): void {
  // no-op: bundle imports are frozen at build time
}
