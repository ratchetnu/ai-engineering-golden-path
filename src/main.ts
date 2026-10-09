#!/usr/bin/env node
/**
 * Composition root: the one place where concrete implementations are wired
 * together. It is allowed to import every layer; nothing imports it.
 */
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { runCli } from './cli/index.ts';
import { FileTaskStore } from './persistence/index.ts';
import { TaskService } from './services/index.ts';

const filePath = process.env['TASKS_FILE'] ?? join(process.cwd(), '.tasks.json');

const service = new TaskService({
  store: new FileTaskStore(filePath),
  clock: { now: () => new Date() },
  ids: { next: () => randomUUID().slice(0, 8) },
});

process.exitCode = await runCli(process.argv.slice(2), service, {
  log: (line) => {
    console.log(line);
  },
  error: (line) => {
    console.error(line);
  },
});
