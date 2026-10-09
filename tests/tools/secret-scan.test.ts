import { describe, expect, it } from 'vitest';
import { redact, scanFile } from '../../tools/secret-scan/scan.ts';

// Example credentials are assembled at runtime so this file never contains
// a string that looks like a real secret. They are fake.
const fakeAwsKey = ['AKIA', 'ABCDEFGHIJKLMNOP'].join('');
const fakeGithubToken = ['ghp', '_', 'a'.repeat(36)].join('');
const fakePrivateKey = ['-----BEGIN', 'RSA PRIVATE', 'KEY-----'].join(' ');
const fakePassword = ['correct', 'horse', 'battery'].join('-');
const fakeDbPassword = ['s3cret', 'pass'].join('');
const passwordAssignment = 'const password = ' + JSON.stringify(fakePassword) + ';';
const connectionString = ['DATABASE_URL=postgres://app', fakeDbPassword].join(':') + '@db.example.com/app';

describe('secret scan', () => {
  it.each([
    ['aws-access-key-id', `const key = "${fakeAwsKey}";`],
    ['github-token', `token: ${fakeGithubToken}`],
    ['private-key', fakePrivateKey],
    ['hardcoded-credential', passwordAssignment],
    ['connection-string-password', connectionString],
  ])('detects %s', (patternId, line) => {
    expect(scanFile({ path: 'src/x.ts', text: `ok\n${line}\n` })).toMatchObject([{ patternId, line: 2 }]);
  });

  it('never prints the full secret', () => {
    const [finding] = scanFile({ path: 'a.ts', text: fakeAwsKey });
    expect(finding?.preview).not.toContain(fakeAwsKey);
    expect(redact('short')).toBe('****');
  });

  it('flags committed .env files but allows .env.example', () => {
    expect(scanFile({ path: '.env', text: '' })).toMatchObject([{ patternId: 'forbidden-file' }]);
    expect(scanFile({ path: 'config/.env.production', text: '' })).toMatchObject([{ patternId: 'forbidden-file' }]);
    expect(scanFile({ path: '.env.example', text: 'API_KEY=' })).toEqual([]);
  });

  it('accepts a reviewed false positive marked on the same line', () => {
    expect(scanFile({ path: 'a.ts', text: `${fakeAwsKey} // secret-scan: allow` })).toEqual([]);
  });

  it('ignores ordinary code that mentions passwords', () => {
    expect(scanFile({ path: 'a.ts', text: 'const password = process.env["DB_PASSWORD"];' })).toEqual([]);
  });
});
