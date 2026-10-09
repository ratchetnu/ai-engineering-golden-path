import { rmSync } from 'node:fs';

// Start every build from an empty folder so stale files cannot hide a problem.
rmSync('dist', { recursive: true, force: true });
