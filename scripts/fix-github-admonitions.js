#!/usr/bin/env node
/**
 * This script fixes multiple markdown formatting issues:
 * 1. Escaped GitHub admonitions like > \[!TIP] to > [!TIP]
 * 2. Escaped ampersands in badge URLs like \& to &
 * 3. Escaped backslashes like \ to proper content
 * 4. Escaped checkbox markers like - \[/] to - [/]
 *
 * @security This script only modifies markdown formatting, no security implications
 */
import { readFile, writeFile } from 'fs/promises';
import { glob } from 'glob';
import process from 'node:process';

/**
 * Fixes escaped markdown elements in markdown files.
 */
export const fixGithubAdmonitions = async () => {
  try {
    // Find all markdown files
    const files = await glob('**/*.md', {
      // ignore common generated or meta folders and the .github directory
      ignore: ['node_modules/**', '.git/**', '.github/**'],
    });

    console.log(`🔧 Fixing markdown formatting issues in ${files.length} files...`);

    for (const file of files) {
      let content = await readFile(file, 'utf8');

      // Preserve frontmatter and skip fenced code blocks when doing replacements.
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
        if (i < bodyStart || inCodeFence) {
          continue;
        }

        let newLine = line;

        const isBlockquote = /^\s*>/.test(line);

        if (isBlockquote) {
          // Fix escaped GitHub admonition markers like \[!TIP] to [!TIP]
          newLine = newLine.replace(
            /\\(\[!(?:TIP|NOTE|WARNING|IMPORTANT|CAUTION|DANGER)\])/g,
            '$1',
          );
        }

        // Fix escaped ampersands in URLs and badges (outside of code blocks)
        if (!/`.*`/.test(newLine)) {
          newLine = newLine.replace(/\\(&)/g, '$1');
        }

        // Fix escaped checkboxes in task lists like - \[/] or - \[ ] or - \[x]
        newLine = newLine.replace(/^(\s*- )\\(\[[^\]]*\])/, '$1$2');

        // Fix standalone escaped backslashes that appear alone on lines or at start of lines
        if (/^\s*\\(\s*)?$/.test(newLine)) {
          newLine = newLine.replace(/^\s*\\(\s*)?$/, '');
        }

        // Fix escaped underscores in headings (# BACKEND\_TITLE -> # BACKEND_TITLE)
        if (/^#+\s/.test(newLine)) {
          newLine = newLine.replace(/\\_/g, '_');
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
        console.log(`  ✓ Fixed: ${file}`);
      }
    }

    console.log('🎉 Markdown formatting fix complete!');
  } catch (error) {
    console.error('❌ Error fixing markdown formatting:', error);
    process.exit(1);
  }
};

// Run if called directly
if (import.meta.url.endsWith(process.argv[1])) {
  fixGithubAdmonitions();
}
