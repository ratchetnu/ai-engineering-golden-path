import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { Task } from '../domain/index.ts';
import type { TaskStore } from './taskStore.ts';

export class CorruptStoreError extends Error {
  override readonly name = 'CorruptStoreError';
}

/** Stores tasks as a JSON file. Writes go to a temp file first, then rename. */
export class FileTaskStore implements TaskStore {
  readonly #filePath: string;

  constructor(filePath: string) {
    this.#filePath = filePath;
  }

  async load(): Promise<readonly Task[]> {
    let raw: string;
    try {
      raw = await readFile(this.#filePath, 'utf8');
    } catch (error: unknown) {
      if (isNodeError(error) && error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new CorruptStoreError(`Task file is not valid JSON: ${this.#filePath}`);
    }
    if (!Array.isArray(parsed) || !parsed.every(isTask)) {
      throw new CorruptStoreError(`Task file has an unexpected shape: ${this.#filePath}`);
    }
    return parsed;
  }

  async save(tasks: readonly Task[]): Promise<void> {
    await mkdir(dirname(this.#filePath), { recursive: true });
    const tempPath = `${this.#filePath}.tmp`;
    await writeFile(tempPath, `${JSON.stringify(tasks, null, 2)}\n`, 'utf8');
    await rename(tempPath, this.#filePath);
  }
}

function isTask(value: unknown): value is Task {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record['id'] === 'string' &&
    typeof record['title'] === 'string' &&
    typeof record['createdAt'] === 'string' &&
    (record['completedAt'] === null || typeof record['completedAt'] === 'string')
  );
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}
