import { readdirSync, readFileSync } from 'node:fs';
import { join, posix, relative, sep } from 'node:path';
import ts from 'typescript';
import {
  ALLOWED_DEPENDENCIES,
  LAYERS,
  RULE_DESCRIPTIONS,
  STORAGE_MODULES,
  STORAGE_OWNER,
} from './rules.ts';
import type { Layer, LayerDefinition, RuleId } from './rules.ts';

export interface SourceFile {
  /** Repo-relative POSIX path, for example "src/cli/cli.ts". */
  readonly path: string;
  readonly text: string;
}

export interface Violation {
  readonly rule: RuleId;
  readonly file: string;
  readonly line: number;
  readonly importPath: string;
  readonly message: string;
  readonly fix: string;
}

interface ImportReference {
  readonly specifier: string;
  readonly line: number;
}

/** Finds every import, export-from, dynamic import() and require() in a file. */
export function findImports(text: string): ImportReference[] {
  const info = ts.preProcessFile(text, true, true);
  return info.importedFiles.map((ref) => ({
    specifier: ref.fileName,
    line: lineOf(text, ref.pos),
  }));
}

export function layerOf(filePath: string): LayerDefinition | undefined {
  return LAYERS.find((layer) =>
    layer.path.endsWith('/') ? filePath.startsWith(layer.path) : filePath === layer.path,
  );
}

/** Pure function: checks a set of in-memory files. Easy to unit test. */
export function checkFiles(files: readonly SourceFile[]): Violation[] {
  const violations: Violation[] = [];

  for (const file of files) {
    const layer = layerOf(file.path);
    if (layer === undefined) {
      violations.push({
        rule: 'unassigned-file',
        file: file.path,
        line: 1,
        importPath: '',
        message: `${RULE_DESCRIPTIONS['unassigned-file']} "${file.path}" is not inside any layer.`,
        fix: `Move the file into one of: ${LAYERS.map((l) => l.path).join(', ')}, or add a new layer to tools/architecture/rules.ts (requires maintainer review).`,
      });
      continue;
    }

    for (const ref of findImports(file.text)) {
      const violation = checkImport(file.path, layer, ref);
      if (violation !== undefined) {
        violations.push(violation);
      }
    }
  }

  return violations;
}

function checkImport(
  filePath: string,
  layer: LayerDefinition,
  ref: ImportReference,
): Violation | undefined {
  const base = { file: filePath, line: ref.line, importPath: ref.specifier };

  if (STORAGE_MODULES.includes(ref.specifier) && layer.name !== STORAGE_OWNER) {
    return {
      ...base,
      rule: 'storage-access',
      message: `${RULE_DESCRIPTIONS['storage-access']} The ${layer.name} layer imports "${ref.specifier}".`,
      fix: `Add or reuse a method on a service (src/services) that goes through the TaskStore interface in src/persistence, and call that instead.`,
    };
  }

  if (!ref.specifier.startsWith('.')) {
    return undefined; // Third-party and node: built-ins (other than storage) are allowed.
  }

  const target = posix.normalize(posix.join(posix.dirname(filePath), ref.specifier));
  const targetLayer = layerOf(target) ?? layerOf(`${target}/`);
  if (targetLayer === undefined || targetLayer.name === layer.name) {
    return undefined;
  }

  if (!ALLOWED_DEPENDENCIES[layer.name].includes(targetLayer.name)) {
    const allowed = ALLOWED_DEPENDENCIES[layer.name];
    return {
      ...base,
      rule: 'layer-dependency',
      message: `${layer.name} may not import ${targetLayer.name}. ${layer.name} may import: ${allowed.length === 0 ? 'nothing' : allowed.join(', ')}.`,
      fix: dependencyFix(layer.name, targetLayer.name),
    };
  }

  if (targetLayer.publicEntry !== undefined && !isPublicEntry(target, targetLayer)) {
    return {
      ...base,
      rule: 'public-entry',
      message: `${RULE_DESCRIPTIONS['public-entry']} "${ref.specifier}" reaches inside ${targetLayer.name}.`,
      fix: `Import from "${posix.relative(posix.dirname(filePath), targetLayer.publicEntry)}" and export what you need from there.`,
    };
  }

  return undefined;
}

function isPublicEntry(target: string, layer: LayerDefinition): boolean {
  const entry = layer.publicEntry ?? '';
  const withoutExt = (p: string): string => p.replace(/\.(ts|js)$/, '');
  return (
    withoutExt(target) === withoutExt(entry) ||
    `${target.replace(/\/$/, '')}/index.ts` === entry
  );
}

function dependencyFix(from: Layer, to: Layer): string {
  if (to === 'persistence') {
    return 'Go through a service in src/services instead of using persistence directly.';
  }
  if (from === 'domain') {
    return 'The domain layer must stay independent. Move this logic into a service, or pass the data in as a parameter.';
  }
  return `Move the shared logic to a layer that both may use, or discuss changing ALLOWED_DEPENDENCIES in tools/architecture/rules.ts.`;
}

/** Reads every TypeScript file under <rootDir>/src and checks it. */
export function checkArchitecture(rootDir: string): Violation[] {
  return checkFiles(readSourceFiles(rootDir));
}

export function readSourceFiles(rootDir: string): SourceFile[] {
  const srcDir = join(rootDir, 'src');
  const entries = readdirSync(srcDir, { recursive: true, withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && /\.(ts|mts|cts|tsx)$/.test(entry.name) && !entry.name.endsWith('.d.ts'))
    .map((entry) => {
      const absolute = join(entry.parentPath, entry.name);
      return {
        path: relative(rootDir, absolute).split(sep).join('/'),
        text: readFileSync(absolute, 'utf8'),
      };
    })
    .sort((a, b) => a.path.localeCompare(b.path));
}

function lineOf(text: string, position: number): number {
  let line = 1;
  for (let i = 0; i < position && i < text.length; i += 1) {
    if (text.charCodeAt(i) === 10) {
      line += 1;
    }
  }
  return line;
}
