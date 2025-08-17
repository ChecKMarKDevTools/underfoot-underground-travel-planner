import { visit } from 'unist-util-visit';

export default function remarkUnescape() {
  return (tree) => {
    // Unescape common innocuous sequences in text nodes and link/image URLs.
    // We intentionally avoid changing code or inlineCode nodes.
    // Handle text nodes
    visit(tree, 'text', (node) => {
      if (typeof node.value === 'string') {
        node.value = node.value.replace(/\\([&_`\\])/g, '$1');
      }
    });

    // Handle link and image nodes (url and title)
    visit(tree, ['link', 'image'], (node) => {
      if (typeof node.url === 'string') {
        node.url = node.url.replace(/\\([&_`\\])/g, '$1');
      }
      if (typeof node.title === 'string') {
        node.title = node.title.replace(/\\([&_`\\])/g, '$1');
      }
    });

    // Handle reference-style definitions (reference links)
    visit(tree, 'definition', (node) => {
      if (typeof node.url === 'string') {
        node.url = node.url.replace(/\\([&_`\\])/g, '$1');
      }
      if (typeof node.title === 'string') {
        node.title = node.title.replace(/\\([&_`\\])/g, '$1');
      }
    });

    // HTML nodes sometimes contain raw attribute strings with escapes
    visit(tree, 'html', (node) => {
      if (typeof node.value === 'string') {
        node.value = node.value.replace(/\\([&_`\\])/g, '$1');
      }
    });
  };
}
