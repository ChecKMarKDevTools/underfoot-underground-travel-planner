const remarkGfm = require('remark-gfm');
const remarkFrontmatter = require('remark-frontmatter');
const remarkGitHub = require('remark-github');
const remarkUnescape = require('./scripts/remark-unescape.cjs');

module.exports = {
  settings: {
    // use underscores for emphasis (italics)
    emphasis: '_',
    bullet: '-',
    rule: '-',
    tableCellPadding: false,
    tablePipeAlign: false,
    entities: false,
  },
  plugins: [
    [remarkGitHub, { repository: 'checkmarkdevtools/underfoot-underground-travel-planner' }],
    [remarkGfm, { singleTilde: false, tableCellPadding: false, tablePipeAlign: false }],
    remarkUnescape,
    [remarkFrontmatter, { type: 'yaml', marker: '-' }],
  ],
};
// NOTE: remark has been intentionally disabled in this workspace.
// If you want to re-enable remark formatting, restore the original
// configuration from version control or remove this file.

// Minimal disabled config exported as CommonJS so tools that `require()`
// the file won't fail. This keeps editors and CI stable while remark is off.
module.exports = {
  settings: {},
  plugins: [],
};

/*
Original .remarkrc.cjs (preserved here for convenience):

const remarkGfm = require('remark-gfm');
const remarkFrontmatter = require('remark-frontmatter');
const remarkGitHub = require('remark-github');
const remarkUnescape = require('./scripts/remark-unescape.cjs');

module.exports = {
  settings: {
    // use underscores for emphasis (italics)
    emphasis: '_',
    bullet: '-',
    rule: '-',
    tableCellPadding: false,
    tablePipeAlign: false,
    entities: false,
  },
  plugins: [
    [remarkGitHub, { repository: 'checkmarkdevtools/underfoot-underground-travel-planner' }],
    [remarkGfm, { singleTilde: false, tableCellPadding: false, tablePipeAlign: false }],
    remarkUnescape,
    [remarkFrontmatter, { type: 'yaml', marker: '-' }],
  ],
};

*/
