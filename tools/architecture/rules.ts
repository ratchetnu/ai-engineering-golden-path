/**
 * Architecture rules, written as data so they are easy to read and review.
 *
 * Changing this file changes what the whole team is allowed to do, so it is
 * owned by the maintainers in .github/CODEOWNERS and PR validation asks for a
 * written justification whenever it changes.
 */

export type Layer = 'domain' | 'persistence' | 'services' | 'cli' | 'composition-root';

export interface LayerDefinition {
  readonly name: Layer;
  /** Folder (or single file) that belongs to this layer, relative to the repo root. */
  readonly path: string;
  /** If set, other layers may only import this file, not files deeper inside the folder. */
  readonly publicEntry?: string;
  readonly description: string;
}

export const LAYERS: readonly LayerDefinition[] = [
  {
    name: 'composition-root',
    path: 'src/main.ts',
    description: 'Wires concrete implementations together. May import every layer.',
  },
  {
    name: 'domain',
    path: 'src/domain/',
    publicEntry: 'src/domain/index.ts',
    description: 'Business rules and data types. Depends on nothing.',
  },
  {
    name: 'persistence',
    path: 'src/persistence/',
    publicEntry: 'src/persistence/index.ts',
    description: 'The only layer that reads or writes storage.',
  },
  {
    name: 'services',
    path: 'src/services/',
    publicEntry: 'src/services/index.ts',
    description: 'Application use cases. Talks to storage only through persistence.',
  },
  {
    name: 'cli',
    path: 'src/cli/',
    publicEntry: 'src/cli/index.ts',
    description: 'Command-line interface. Talks to services, never to storage.',
  },
];

/** Which layers each layer may import. Anything not listed is forbidden. */
export const ALLOWED_DEPENDENCIES: Readonly<Record<Layer, readonly Layer[]>> = {
  domain: [],
  persistence: ['domain'],
  services: ['domain', 'persistence'],
  cli: ['domain', 'services'],
  'composition-root': ['domain', 'persistence', 'services', 'cli'],
};

/**
 * Modules that give direct access to storage. Only the layer named in
 * STORAGE_OWNER may import them.
 */
export const STORAGE_MODULES: readonly string[] = [
  'fs',
  'fs/promises',
  'node:fs',
  'node:fs/promises',
  'node:sqlite',
];

export const STORAGE_OWNER: Layer = 'persistence';

export type RuleId =
  | 'storage-access'
  | 'layer-dependency'
  | 'public-entry'
  | 'unassigned-file';

export const RULE_DESCRIPTIONS: Readonly<Record<RuleId, string>> = {
  'storage-access': `Only ${STORAGE_OWNER} may access storage directly.`,
  'layer-dependency': 'A layer may only import the layers it is allowed to depend on.',
  'public-entry': "Other layers must import a layer through its index.ts, not its internal files.",
  'unassigned-file': 'Every source file must belong to a known layer.',
};
