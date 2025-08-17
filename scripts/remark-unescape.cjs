const visitParentsModule = require('unist-util-visit-parents');
const visitParents = (visitParentsModule && visitParentsModule.visitParents) || visitParentsModule;

module.exports = function remarkUnescape() {
  return (tree) => {
    // Handle text nodes (skip if any ancestor is YAML or code)
    visitParents(tree, 'text', (node, ancestors) => {
      if (!ancestors || ancestors.length === 0) return;
      // If any ancestor is yaml or code, skip
      for (const anc of ancestors) {
        if (!anc) continue;
        if (anc.type === 'yaml' || anc.type === 'code') return;
      }
      if (typeof node.value === 'string') {
        node.value = node.value.replace(/\\([&\\])/g, '$1');
      }
    });

    // Handle link and image nodes (url and title)
    visitParents(tree, ['link', 'image'], (node, ancestors) => {
      if (ancestors && ancestors.some((a) => a && a.type === 'yaml')) return;
      if (typeof node.url === 'string') {
        node.url = node.url.replace(/\\([&\\])/g, '$1');
      }
      if (typeof node.title === 'string') {
        node.title = node.title.replace(/\\([&\\])/g, '$1');
      }
    });

    // Handle definitions
    visitParents(tree, 'definition', (node, ancestors) => {
      if (ancestors && ancestors.some((a) => a && a.type === 'yaml')) return;
      if (typeof node.url === 'string') {
        node.url = node.url.replace(/\\([&\\])/g, '$1');
      }
      if (typeof node.title === 'string') {
        node.title = node.title.replace(/\\([&\\])/g, '$1');
      }
    });

    // Handle html nodes
    visitParents(tree, 'html', (node, ancestors) => {
      if (ancestors && ancestors.some((a) => a && a.type === 'yaml')) return;
      if (typeof node.value === 'string') {
        node.value = node.value.replace(/\\([&\\])/g, '$1');
      }
    });
  };
};
