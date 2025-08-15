#!/usr/bin/env node
/**
 * This script fixes the issue where remark-stringify escapes GitHub
 * admonitions like > [!TIP] to > \[!TIP]
 *
 * @security This script only modifies markdown formatting, no security implications
 */
import { readFile, writeFile } from 'fs/promises';
import { glob } from 'glob';
import process from 'node:process';

/**
 * Fixes escaped GitHub admonitions in markdown files.
 * Converts function expression to declaration for clarity and consistency.
 */
export const fixGithubAdmonitions = async () => {
  try {
    // Find all markdown files
    const files = await glob('**/*.md', {
      ignore: ['node_modules/**', '.git/**'],
    });

    console.log(`🔧 Fixing GitHub admonitions in ${files.length} markdown files...`);

    for (const file of files) {
      let content = await readFile(file, 'utf8');

      // Fix escaped GitHub admonitions in blockquotes
      const fixedContent = content.replace(
        /^> \\(\[!(?:TIP|NOTE|WARNING|IMPORTANT|CAUTION|DANGER)\])/gm,
        '> $1',
      );

      if (fixedContent !== content) {
        await writeFile(file, fixedContent, 'utf8');
      }
    }

    console.log('🎉 GitHub admonitions fix complete!');
  } catch (error) {
    console.error('❌ Error fixing GitHub admonitions:', error);
    process.exit(1);
  }
};

// Run if called directly
if (import.meta.url.endsWith(process.argv[1])) {
  fixGithubAdmonitions();
}
