# Screenshots for User Documentation

This directory contains screenshots that illustrate the Underfoot user interface and functionality. These images are referenced throughout the user guide documentation.

## Screenshot Files

### Basic Interface
- `01-landing-page.png` - Initial Underfoot interface on first load
- `02-chat-input-focused.png` - Message input area when focused and ready for typing
- `03-chat-input-filled.png` - Example message filled in and ready to send

### Results and Interaction
- `04-chat-with-results.png` - Complete chat conversation showing results
- `06-result-cards-detail.png` - Detailed view of result cards with all information

### Advanced Features
- `05-debug-view-open.png` - Debug View panel showing technical information

### Mobile Experience
- `07-mobile-view.png` - Mobile-optimized interface layout

## Taking Screenshots

To capture these screenshots for documentation:

1. **Start the development server**:
   ```bash
   cd frontend
   npm run dev
   ```

2. **Use the screenshot script** (when Playwright is available):
   ```bash
   node scripts/take-screenshots.js
   ```

3. **Manual capture process**:
   - Navigate to `http://localhost:5174/labs/underfoot/`
   - Use browser developer tools to simulate mobile view
   - Capture screenshots at key interaction points
   - Save with descriptive filenames

## Screenshot Standards

- **Resolution**: 1200x800 for desktop, 375x667 for mobile
- **Format**: PNG for clarity
- **Content**: Show realistic example data
- **Quality**: High resolution for documentation use

## Updating Screenshots

When the UI changes:
1. Update screenshots to reflect current interface
2. Verify all documentation references are still accurate
3. Test that screenshot references work in all documentation files
4. Consider adding new screenshots for new features

---

*Note: Some screenshot files may be placeholders until Playwright browser installation is resolved.*