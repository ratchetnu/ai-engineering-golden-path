/**
 * Patterns for credentials that should never be committed.
 *
 * This is a small, readable scanner meant to show the control. A larger
 * organisation would also run a dedicated tool (for example gitleaks or
 * GitHub secret scanning with push protection) - see the README.
 */

export interface SecretPattern {
  readonly id: string;
  readonly description: string;
  readonly regex: RegExp;
}

export const SECRET_PATTERNS: readonly SecretPattern[] = [
  {
    id: 'private-key',
    description: 'Private key block',
    regex: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP |ENCRYPTED )?PRIVATE KEY-----/,
  },
  { id: 'aws-access-key-id', description: 'AWS access key ID', regex: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/ },
  { id: 'github-token', description: 'GitHub token', regex: /\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{60,})\b/ },
  { id: 'npm-token', description: 'npm access token', regex: /\bnpm_[A-Za-z0-9]{36}\b/ },
  { id: 'slack-token', description: 'Slack token', regex: /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/ },
  { id: 'stripe-live-key', description: 'Stripe live secret key', regex: /\b(?:sk|rk)_live_[A-Za-z0-9]{20,}\b/ },
  { id: 'google-api-key', description: 'Google API key', regex: /\bAIza[0-9A-Za-z_-]{35}\b/ },
  { id: 'anthropic-api-key', description: 'Anthropic API key', regex: /\bsk-ant-[A-Za-z0-9_-]{20,}\b/ },
  { id: 'openai-api-key', description: 'OpenAI-style API key', regex: /\bsk-(?:proj-)?[A-Za-z0-9]{32,}\b/ },
  {
    id: 'jwt',
    description: 'JSON Web Token',
    regex: /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/,
  },
  {
    id: 'connection-string-password',
    description: 'Connection string with an embedded password',
    regex: /\b[a-z][a-z0-9+.-]*:\/\/[^\s:/@]+:[^\s@/]{6,}@[^\s/]+/i,
  },
  {
    id: 'hardcoded-credential',
    description: 'Credential-like value assigned in code',
    regex: /\b(?:password|passwd|secret|api[_-]?key|access[_-]?token|auth[_-]?token)\b\s*[:=]\s*['"][^'"\s]{12,}['"]/i,
  },
];

/** Files that should never be committed, whatever they contain. */
export const FORBIDDEN_FILE_NAMES: readonly RegExp[] = [
  /(^|\/)\.env(\.[^/]+)?$/,
  /(^|\/)id_(rsa|dsa|ecdsa|ed25519)$/,
  /\.(pem|p12|pfx|key)$/,
];

/** `.env.example` documents variable names without values, so it is allowed. */
export const ALLOWED_FILE_NAMES: readonly RegExp[] = [/(^|\/)\.env\.example$/];

/** Put this on a line to accept a known false positive. Reviewers see it in the diff. */
export const ALLOW_MARKER = 'secret-scan: allow';
