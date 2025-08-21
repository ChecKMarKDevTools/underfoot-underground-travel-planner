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
      // ignore common generated or meta folders and the .github directory
      ignore: ['node_modules/**', '.git/**', '.github/**'],
    });

    console.log(`🔧 Fixing GitHub admonitions in ${files.length} markdown files...`);

    for (const file of files) {
      let content = await readFile(file, 'utf8');

      // Preserve frontmatter and skip fenced code blocks when doing replacements.
      // We'll operate on the body only (after frontmatter) and only on lines
      // that are not inside ``` fences. This avoids accidentally changing
      // YAML, code samples, or other sensitive regions.
      const lines = content.split(/\r?\n/);

      // detect frontmatter at the very top (--- or ...)
      let bodyStart = 0;
      if (lines[0] === '---' || lines[0] === '...') {
        // find the closing frontmatter marker
        for (let i = 1; i < lines.length; i++) {
          if (lines[i] === '---' || lines[i] === '...') {
            bodyStart = i + 1;
            break;
          }
        }
      }

      let inCodeFence = false;
      let changed = false;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // toggle fenced code block state when we encounter ``` (or ~~~) fences
        if (/^\s*(```|~~~)/.test(line)) {
          inCodeFence = !inCodeFence;
          continue; // don't touch fence lines themselves
        }

        // only operate on the body (after frontmatter) and when not in a code fence
        if (i < bodyStart || inCodeFence) continue;

        // We'll treat blockquote/admonition fixes separately from general
        // escaped-underscore fixes. This lets us unescape admonition markers
        // only in blockquotes (where they occur) while still converting
        // escaped underscores that appear inside bold text or regular
        // paragraphs.

        let newLine = line;

        const isBlockquote = /^\s*>/.test(line);

        if (isBlockquote) {
          // Unescape backslash before GitHub admonition markers like \[!TIP]
          // Only remove the single backslash immediately before the `[` so other
          // intentional backslashes remain untouched.
          newLine = newLine.replace(
            /\\(\[!(?:TIP|NOTE|WARNING|IMPORTANT|CAUTION|DANGER)\])/g,
            '$1',
          );
        }

        // Convert escaped-underscore identifiers like `underfoot\_orchestrator`
        // into inline code `underfoot_orchestrator` for stable rendering.
        // Only do this on lines that do not already contain inline code/backticks
        // or obvious URLs/links to avoid accidental changes.
        if (!/`/.test(newLine) && !/https?:\/\//.test(newLine) && !/\[.*\]\(.*\)/.test(newLine)) {
          // match identifiers that contain one or more escaped underscores
          // e.g. underfoot\_orchestrator or rank\_and\_format
          newLine = newLine.replace(/([A-Za-z0-9]+(?:\\_[A-Za-z0-9]+)+)/g, (match) => {
            // convert escaped underscores to literal underscores
            const unescaped = match.replace(/\\_/g, '_');
            // wrap in inline code so Markdown renderers treat it literally
            return `\`${unescaped}\``;
          });
        }

        if (newLine !== line) {
          lines[i] = newLine;
          changed = true;
        }
      }

      if (changed) {
        const fixedContent = lines.join('\n');
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
