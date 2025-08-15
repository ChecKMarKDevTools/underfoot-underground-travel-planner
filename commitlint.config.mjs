export default {
  // The following line defines specific presets (also called shared configs) to use for commitlint.
  // This is the most common preset, which is based on the Conventional Commits specification.
  // Others are available, but this is the most widely used.
  // See: https://commitlint.js.org/reference/configuration.html#shareable-configuration
  extends: ['@commitlint/config-conventional'],

  // Rule format: 'rule-name': [level, applicable, value]
  //   - Level: 0 = off, 1 = warning, 2 = error
  //   - Applicable: 'always' or 'never'
  //   - Value: can be an array of values or a number, depending on the rule
  //     - An array defining a single value may instead be input as a string for clarity
	// See: https://commitlint.js.org/#/reference-rules for the full list
  rules: {

	  // These are the default rules for the @commitlint/config-conventional plugin installed above
    // I added them here for visibility and commented out ones I overrode below.
    // You can delete everything in this upper section and nothing will change as long as you keep the `extends` line above.
    'type-enum': [2, 'always', [
      'build', 'chore', 'ci', 'docs', 'feat', 'fix', 'perf', 'refactor', 'revert', 'style', 'test'
    ]],
    // 'type-case': [0, 'always', 'lower-case'],
    'type-empty': [2, 'never'],
    'scope-enum': [0, 'always', []],
    // 'scope-case': [0, 'always', 'lower-case'],
    // 'scope-empty': [0, 'never'],
    'scope-max-length': [0, 'always', 0],
    'scope-min-length': [0, 'always', 0],
    // 'subject-case': [0, 'never', ['sentence-case', 'start-case', 'pascal-case', 'upper-case']],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    // 'subject-max-length': [0, 'always', 0],
    'subject-min-length': [0, 'always', 0],
    // 'body-leading-blank': [1, 'always'],
    // 'body-max-line-length': [0, 'always', 0],
    'footer-leading-blank': [1, 'always'],
    // 'footer-max-line-length': [0, 'always', 0],
    'header-max-length': [2, 'always', 72], // Matches length in GitHub when it stops showing the subject line in the UI

    // END of default rules from @commitlint/config-conventional preset

    // -------------------------------------------------------------------------

    // These are my custom rules that modify the default values above
    // I'll explain more in the wiki docs, coming up next 😊
    'header-trim': [1, 'always'], // Encourage trimming of the start and endheader line
    'type-case': [2, 'always', 'lower-case'], // Keep lower-case for type and turn rule on error
    'scope-empty': [2, 'never'], // Force scope to exist, but does not restrict values (that's a different rule)
    'scope-case': [2, 'always', 'lower-case'],  // Enforce strict conventional commit guidelines
    'subject-case': [2, 'always', 'lower-case'], // May also be sentence-case in conventional style, but I had already started with this one
    'body-leading-blank': [2, 'always'], // Keep the blank line, but make it an error
    'body-empty': [2, 'never'], // Enforce a body section in the commit message
    'body-max-line-length': [2, 'always', 100],  // Enforce strict conventional commit guidelines
    'footer-max-line-length': [2, 'always', 100], // Enforce strict conventional commit guidelines
    'signed-off-by': [2, 'always'], // Enforce a "Signed-off-by" line in the footer (optional, but use with below rule)
    'trailer-exists': [2, 'always', 'Signed-off-by'], // Enforce a value following "Signed-off-by:" line in the footer

    // END of custom rules
  }
};
