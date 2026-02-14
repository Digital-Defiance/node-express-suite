/**
 * Feature: break-circular-dependency
 * Property 1: No express-suite imports from brightchain-lib
 *
 * For any TypeScript source file in express-suite/src/, no import statement
 * should reference @brightchain/brightchain-lib.
 *
 * Validates: Requirements 2.1, 2.3
 */
import * as fs from 'fs';
import * as path from 'path';
import * as fc from 'fast-check';

/** Recursively enumerate all non-test .ts files under a directory */
function getAllSourceTsFiles(dir: string): string[] {
  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Skip __tests__ directories
      if (entry.name === '__tests__') continue;
      results.push(...getAllSourceTsFiles(fullPath));
    } else if (
      entry.isFile() &&
      entry.name.endsWith('.ts') &&
      !entry.name.endsWith('.spec.ts') &&
      !entry.name.endsWith('.test.ts')
    ) {
      results.push(fullPath);
    }
  }
  return results;
}

describe('Feature: break-circular-dependency, Property 1: No express-suite imports from brightchain-lib', () => {
  const srcDir = path.resolve(__dirname, '../../src');
  const sourceFiles = getAllSourceTsFiles(srcDir);

  it('should have source files to test', () => {
    expect(sourceFiles.length).toBeGreaterThan(0);
  });

  it('no source file imports from @brightchain/brightchain-lib', () => {
    const importPattern = /from\s+['"]@brightchain\/brightchain-lib['"]/;
    const requirePattern =
      /require\s*\(\s*['"]@brightchain\/brightchain-lib['"]\s*\)/;

    fc.assert(
      fc.property(fc.constantFrom(...sourceFiles), (filePath: string) => {
        const content = fs.readFileSync(filePath, 'utf-8');
        const relativePath = path.relative(srcDir, filePath);

        if (importPattern.test(content) || requirePattern.test(content)) {
          throw new Error(
            `File "${relativePath}" contains a reference to @brightchain/brightchain-lib`,
          );
        }
      }),
      { numRuns: Math.max(100, sourceFiles.length) },
    );
  });
});
