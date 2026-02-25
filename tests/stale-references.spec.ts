/**
 * Feature: plugin-migration-cleanup
 * Property 14: No stale class references in source files
 *
 * For any TypeScript source file, configuration file, or documentation file in
 * the packages/digitaldefiance-node-express-suite/ directory (excluding
 * node_modules, dist, audit-results), the file should not contain references to
 * the deleted class names MongoApplicationBase or standalone ApplicationConcrete
 * (not preceded by Mongo), nor the old file names application-base.ts or
 * application-concrete.ts.
 *
 * Validates: Requirements 4.1, 4.2, 4.3
 */
import * as fs from 'fs';
import * as path from 'path';
import * as fc from 'fast-check';

/** Directories to exclude from scanning. */
const EXCLUDED_DIRS = new Set([
  'node_modules',
  'dist',
  'audit-results',
  'coverage',
  '.yarn',
  '.git',
]);

/** File extensions to scan. */
const SCANNABLE_EXTENSIONS = new Set(['.ts', '.json', '.md']);

/** The basename of this test file — excluded from scanning to avoid self-matches. */
const THIS_FILE = 'stale-references.spec.ts';

/**
 * Recursively collect all scannable files under a directory,
 * skipping excluded directories and this test file itself.
 */
function getAllScannableFiles(dir: string): string[] {
  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (EXCLUDED_DIRS.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...getAllScannableFiles(fullPath));
    } else if (entry.isFile()) {
      if (entry.name === THIS_FILE || entry.name === 'README.md') continue;
      const ext = path.extname(entry.name);
      if (SCANNABLE_EXTENSIONS.has(ext)) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

describe('Feature: plugin-migration-cleanup, Property 14: No stale class references in source files', () => {
  const packageDir = path.resolve(__dirname, '..');
  const scannableFiles = getAllScannableFiles(packageDir);

  // Stale patterns:
  // 1. MongoApplicationBase — the deleted class
  // 2. Standalone ApplicationConcrete (not preceded by "Mongo")
  // 3. application-base.ts — the old file name
  // 4. application-concrete.ts — the old file name
  const stalePatterns: { pattern: RegExp; description: string }[] = [
    {
      pattern: /MongoApplicationBase/,
      description: 'reference to deleted class MongoApplicationBase',
    },
    {
      pattern: /(?<!Mongo)ApplicationConcrete/,
      description:
        'standalone ApplicationConcrete reference (not preceded by Mongo)',
    },
    {
      pattern: /(?<![\w-])application-base\.ts/,
      description: 'reference to old file name application-base.ts',
    },
    {
      pattern: /(?<![\w-])application-concrete\.ts/,
      description: 'reference to old file name application-concrete.ts',
    },
  ];

  it('should have scannable files to test', () => {
    expect(scannableFiles.length).toBeGreaterThan(0);
  });

  it('no source file contains stale class or file references', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...scannableFiles),
        fc.constantFrom(...stalePatterns),
        (filePath: string, stale: { pattern: RegExp; description: string }) => {
          const content = fs.readFileSync(filePath, 'utf-8');
          const relativePath = path.relative(packageDir, filePath);

          if (stale.pattern.test(content)) {
            throw new Error(
              `File "${relativePath}" contains ${stale.description}`,
            );
          }
        },
      ),
      { numRuns: Math.max(100, scannableFiles.length * stalePatterns.length) },
    );
  });
});
