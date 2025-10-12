# Frontend Development Guidelines

## Language & Syntax

ES2020+ with ES6 syntax. TypeScript is present and fine to maintain, but prefer duck typing. Keep type annotations minimal.

## Security

### Application

- Never expose API keys or secrets in frontend code
- Sanitize all user inputs before rendering
- Use environment variables via `VITE_` prefix
- Validate external data sources
- CSP headers and HTTPS-only in production

### User Privacy

- **Zero logging** of user queries, locations, or personal data
- **Zero storage** beyond session memory
- **Zero tracking** without explicit consent
- All geolocation data is ephemeral
- No third-party tracking by default

### Data Handling

- Keep user interactions in-memory only
- Clear sensitive data on unmount
- Never persist location data to localStorage without consent
- Redact API keys from debug panels

## Design Philosophy

Follow KISS, YAGNI, and maintain modularity. One component, one responsibility. Build what's needed, not what might be needed. Keep coupling loose, cohesion high.

## Code Standards

```javascript
// Imports: external first, internal second
import { useState } from 'react';
import { CustomHook } from '../hooks/useCustom';

export function Component({ prop1, prop2 }) {
  const [state, setState] = useState();
  const handleEvent = () => {};
  return <div />;
}
```

### Naming

- Components: PascalCase
- Hooks: camelCase with `use` prefix
- Utils/Services: camelCase
- Constants: `UPPER_SNAKE_CASE`

## Testing

Test value, not lines. Focus on critical paths and user interactions, not implementation details.

### Coverage Targets

- Critical features (auth, payment, data submission): 90%+
- User flows (navigation, forms, interactions): 80%+
- UI components (rendering, props, states): 60%+
- Utils/Services (business logic): 80%+

## Dependencies

Before adding:

1. Solvable with existing dependencies?
2. Value vs. code size?
3. Actively maintained (commits in last 6 months)?
4. Known vulnerabilities?
5. Can we write it in under 100 lines?

Justify all additions.

## Performance

- Bundle under 200KB (gzipped)
- Initial load under 2s (3G)
- Interactive in under 3s
- Lighthouse score above 90

Lazy load, debounce, cache, batch. Memo only when profiled.

## Accessibility

- Keyboard navigable
- ARIA labels on custom controls
- WCAG AA contrast ratios
- Visible focus indicators
- Screen reader tested
- Respect motion preferences

## Code Changes

- Must be reviewed in playwright before commit
- Ensure unit tests exist with adequate coverage that makes sense
- Avoid coding tests just to add numbers
- Document a `../docs/user_guide` with screenshots using the playwright MCP
- Review these screenshots to make sure they are accurate and clear
- If anything looks off, then you should fix it first and then update
- It is not enough to simply lazy load the default home page. You need to send messages, click map controls, look at debug info, switch the view, and verify all interactive elements function correctly.

## Code Review

- [ ] No secrets exposed
- [ ] No user data logged/stored
- [ ] Security addressed
- [ ] Accessibility met
- [ ] Tests add value
- [ ] Dependencies justified
- [ ] Performance measured
- [ ] KISS/YAGNI followed

## Anti-Patterns

- Storing user data without consent
- Logging sensitive information
- Premature optimization
- Testing implementation details
- Over-engineering
- Unnecessary dependencies
- Breaking accessibility for aesthetics
