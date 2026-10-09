/**
 * Dependency policy: a new package is a long-term decision, not a side effect
 * of one change. This check makes adding one an explicit, reviewable act.
 */

export interface DependencyPolicy {
  readonly dependencies: { readonly allowed: readonly string[] };
  readonly devDependencies: { readonly allowed: readonly string[] };
  readonly requireExactVersions: boolean;
  readonly allowedLicenses: readonly string[];
  readonly devOnlyLicenses: { readonly licenses: readonly string[] };
  readonly deniedPackages: readonly string[];
}

export interface PackageManifest {
  readonly dependencies?: Readonly<Record<string, string>>;
  readonly devDependencies?: Readonly<Record<string, string>>;
}

export interface LockfilePackage {
  readonly version?: string;
  readonly license?: string;
  readonly dev?: boolean;
  readonly dependencies?: Readonly<Record<string, string>>;
  readonly devDependencies?: Readonly<Record<string, string>>;
}

export interface Lockfile {
  readonly lockfileVersion?: number;
  readonly packages?: Readonly<Record<string, LockfilePackage>>;
}

export interface PolicyProblem {
  readonly title: string;
  readonly message: string;
}

const EXACT_VERSION = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/;

export function checkDependencyPolicy(
  manifest: PackageManifest,
  lockfile: Lockfile | undefined,
  policy: DependencyPolicy,
): PolicyProblem[] {
  const problems: PolicyProblem[] = [];

  const sections = [
    ['dependencies', manifest.dependencies ?? {}, policy.dependencies.allowed],
    ['devDependencies', manifest.devDependencies ?? {}, policy.devDependencies.allowed],
  ] as const;

  for (const [section, deps, allowed] of sections) {
    for (const [name, range] of Object.entries(deps)) {
      if (!allowed.includes(name)) {
        problems.push({
          title: `Unapproved package "${name}" in ${section}`,
          message: `Add it to policy/dependency-policy.json in the same PR and explain why it is needed. A maintainer must approve policy changes.`,
        });
      }
      if (policy.requireExactVersions && !EXACT_VERSION.test(range)) {
        problems.push({
          title: `"${name}" uses a version range ("${range}")`,
          message: `Pin an exact version (for example "${range.replace(/^[\^~>=<\s]+/, '')}") so every build installs the same code. Use "npm install --save-exact".`,
        });
      }
    }
  }

  if (lockfile === undefined) {
    problems.push({
      title: 'package-lock.json is missing',
      message: 'Commit the lockfile. CI installs with "npm ci", which needs it to reproduce the exact dependency tree.',
    });
    return problems;
  }

  const root = lockfile.packages?.[''];
  for (const [section, deps] of sections) {
    for (const [name, range] of Object.entries(deps)) {
      if (root?.[section]?.[name] !== range) {
        problems.push({
          title: `package-lock.json is out of date for "${name}"`,
          message: 'Run "npm install" and commit the updated package-lock.json.',
        });
      }
    }
  }

  for (const [path, pkg] of Object.entries(lockfile.packages ?? {})) {
    if (path === '') {
      continue;
    }
    const name = path.slice(path.lastIndexOf('node_modules/') + 'node_modules/'.length);

    if (policy.deniedPackages.includes(name)) {
      problems.push({
        title: `Denied package "${name}" is in the dependency tree`,
        message: `It is on the deny list in policy/dependency-policy.json. Find which dependency pulls it in with "npm ls ${name}".`,
      });
    }

    const allowedHere =
      pkg.dev === true
        ? [...policy.allowedLicenses, ...policy.devOnlyLicenses.licenses]
        : policy.allowedLicenses;
    if (!isLicenseAllowed(pkg.license, allowedHere)) {
      problems.push({
        title: `"${name}@${pkg.version ?? '?'}" has license "${pkg.license ?? 'none declared'}"`,
        message:
          pkg.dev === true
            ? 'This license is not on the allow list, even for dev-only tools.'
            : 'This package ships with the application and its license is not on the allow list.',
      });
    }
  }

  return problems;
}

/** Understands simple SPDX expressions such as "(MIT OR Apache-2.0)". */
export function isLicenseAllowed(license: string | undefined, allowed: readonly string[]): boolean {
  if (license === undefined || license.trim() === '') {
    return false;
  }
  const expression = license.replace(/[()]/g, '').trim();
  if (expression.includes(' OR ')) {
    return expression.split(' OR ').some((part) => isLicenseAllowed(part, allowed));
  }
  if (expression.includes(' AND ')) {
    return expression.split(' AND ').every((part) => isLicenseAllowed(part, allowed));
  }
  return allowed.includes(expression);
}
