# Common Issues

This guide helps you troubleshoot the most frequently encountered issues with Underfoot and provides solutions to get you back to discovering hidden gems.

## Search and Results Issues

### Getting No Results
**Problem**: Underfoot returns very few or no recommendations

**Possible Causes**:
- Location too specific or obscure
- Query criteria too narrow
- Limited local data for that area

**Solutions**:
1. **Broaden your location**: Try nearby cities or regions
   - Instead of "tiny town name", try "near [major city]"
   - Use "within 50 miles of [location]" for wider search
2. **Simplify your criteria**: Remove very specific requirements
   - Instead of "vegan gluten-free coffee shops", try "coffee shops locals love"
3. **Try alternative keywords**: Use different terms for the same concept
   - "Hidden gems" → "local favorites" → "off the beaten path"
4. **Ask for nearby areas**: "What about small towns around [city]?"

### Results Seem Too Mainstream
**Problem**: Recommendations include well-known tourist attractions

**Possible Causes**:
- Query didn't emphasize "underground" preference
- Popular places that still have local appeal
- Limited local alternatives in that area

**Solutions**:
1. **Add exclusion terms**: 
   - "not on TripAdvisor top lists"
   - "avoid tourist traps"
   - "locals only, not touristy"
2. **Emphasize authenticity**:
   - "where locals actually go"
   - "family-owned businesses"
   - "community favorites"
3. **Ask for clarification**: "These look popular - anything more underground?"

### Outdated Information
**Problem**: Result cards contain old information or closed businesses

**Possible Causes**:
- Cached results from previous searches
- Source information is outdated
- Recent business changes

**Solutions**:
1. **Force refresh**: Use Debug View to bypass cache
2. **Check source links**: Verify current information on linked websites
3. **Ask for recent recommendations**: "Places that opened in the last year"
4. **Report issues**: Let us know about outdated information

## Interface and Technical Issues

### Slow Loading or Responses
**Problem**: Underfoot takes a long time to respond or load

**Possible Causes**:
- Slow internet connection
- Complex query processing
- Data source delays
- Browser performance issues

**Solutions**:
1. **Check connection**: Test internet speed, try different network
2. **Simplify query**: Break complex requests into smaller parts
3. **Clear browser cache**: Remove stored data that might be corrupted
4. **Try different browser**: Switch to Chrome, Firefox, or Safari
5. **Check Debug View**: Look for high execution times (>5000ms)

### Debug View Won't Open
**Problem**: Debug View button doesn't respond or panel doesn't appear

**Possible Causes**:
- Browser compatibility issues
- JavaScript errors
- Screen size or resolution problems

**Solutions**:
1. **Refresh the page**: Hard refresh with Ctrl+F5 (Cmd+R on Mac)
2. **Try different browser**: Modern browsers work best
3. **Check browser console**: Look for JavaScript errors (F12 → Console)
4. **Disable browser extensions**: Temporarily disable ad blockers and other extensions

### Mobile Interface Problems
**Problem**: Buttons too small, text hard to read, or interface doesn't fit screen

**Possible Causes**:
- Browser zoom settings
- Device orientation issues
- Outdated mobile browser

**Solutions**:
1. **Adjust zoom**: Use browser zoom controls to resize interface
2. **Rotate device**: Try both portrait and landscape modes
3. **Update browser**: Use latest version of mobile browser
4. **Clear mobile cache**: Clear browser data on mobile device

## Chat and Communication Issues

### Underfoot Doesn't Understand My Query
**Problem**: Results don't match what you asked for

**Possible Causes**:
- Ambiguous location names
- Unclear activity descriptions
- Missing context in your message

**Solutions**:
1. **Be more specific**:
   - "Portland Oregon" not just "Portland"
   - "Hiking trails with waterfalls" not just "outdoors"
2. **Add context**:
   - Include time of year, group size, skill level
   - Mention what you want to avoid
3. **Use examples**: "Like [specific place] but in [new location]"
4. **Try follow-up questions**: Clarify your original intent

### Can't Get the Right Level of Detail
**Problem**: Results are too general or too specific

**Possible Causes**:
- Query needs refinement
- Available data doesn't match your needs
- Unclear communication of preferences

**Solutions**:
1. **For more detail**: Ask follow-up questions about specific results
2. **For broader options**: Remove specific criteria from your query
3. **Use comparison**: "More like X, less like Y"
4. **Specify scope**: "Beginner-friendly" vs "advanced" or "budget" vs "splurge"

### Lost Conversation History
**Problem**: Previous chat messages and results disappear

**Possible Causes**:
- Page refresh or browser restart
- Session timeout
- Browser privacy settings

**Solutions**:
1. **Screenshot important results**: Save key information before it's lost
2. **Use Debug View history**: Access recent queries through Debug View
3. **Bookmark the page**: Avoid accidental navigation away
4. **Copy important information**: Save addresses, names, and details externally

## Location and Geographic Issues

### "Location Not Found" Errors
**Problem**: Underfoot can't identify your specified location

**Possible Causes**:
- Misspelled location names
- Very small or unrecognized places
- Non-standard location formats

**Solutions**:
1. **Check spelling**: Verify correct spelling of city/state/country
2. **Use nearby major cities**: "Near Nashville Tennessee" instead of small town name
3. **Include state/country**: "Paris Texas" vs "Paris France"
4. **Try landmarks**: "Near Yellowstone National Park" as reference point

### Results Too Far from Intended Location
**Problem**: Recommendations are geographically scattered or distant

**Possible Causes**:
- Location parsing identified wrong place
- Search radius too large
- Multiple locations with same name

**Solutions**:
1. **Be more specific**: Include state, region, or country
2. **Set distance limits**: "Within 20 miles of downtown [city]"
3. **Use landmarks**: Reference well-known attractions or neighborhoods
4. **Verify in Debug View**: Check how your location was interpreted

## Performance and Speed Issues

### Long Response Times
**Problem**: Queries take more than 30 seconds to complete

**Diagnostic Steps**:
1. **Check Debug View**: Look at `executionTimeMs` values
2. **Monitor network**: Test internet speed and stability
3. **Simplify query**: Try basic request to test system responsiveness

**Solutions**:
- **Good times (<2000ms)**: Normal operation
- **Slow times (2000-5000ms)**: Acceptable but consider simpler queries
- **Very slow (>5000ms)**: Try breaking query into parts or simplifying location

### Cache-Related Issues
**Problem**: Getting same results repeatedly or outdated information

**Understanding Cache Behavior**:
- Results cached for faster responses
- Cache helps with repeated queries
- May serve outdated information

**Solutions**:
1. **Force refresh**: Use Debug View option to bypass cache
2. **Modify query slightly**: Small changes force fresh search
3. **Wait for cache expiration**: Results refresh automatically after time limit
4. **Check cache status**: Debug View shows hit/miss information

## Browser and Device Compatibility

### Supported Browsers
**Fully Supported**:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**Limited Support**:
- Older browser versions may have reduced functionality
- Internet Explorer not supported

### Device Requirements
**Minimum Requirements**:
- Modern smartphone or computer
- Internet connection
- JavaScript enabled
- Cookies enabled (for session management)

### Feature Availability
Some features may not work on all devices:
- **Debug View**: Requires larger screens for full functionality
- **Copy functions**: May not work in all mobile browsers
- **Keyboard shortcuts**: Desktop browsers only

## Getting Additional Help

### Before Contacting Support
1. **Try basic troubleshooting**: Refresh page, clear cache, try different browser
2. **Check this guide**: Review relevant sections above
3. **Use Debug View**: Gather technical information about the issue
4. **Note error patterns**: When does the issue occur? What triggers it?

### Information to Include
When reporting issues:
- **Browser and version**: Chrome 95, Safari 15, etc.
- **Device type**: iPhone, Android phone, Windows laptop, etc.
- **Error details**: Exact error messages or unexpected behavior
- **Steps to reproduce**: What you did that caused the issue
- **Debug information**: Copy relevant debug data if available

### Temporary Workarounds
While waiting for fixes:
- **Try different device**: Switch from mobile to desktop or vice versa
- **Use alternative browser**: Test with different browser
- **Modify query approach**: Break complex requests into simpler parts
- **Screenshot important results**: Save information before it might be lost

## Next Steps

- Learn [Getting Better Results](./better-results.md) for optimization tips
- Master [Chat Interface](../getting-started/chat-interface.md) for smoother interactions
- Use [Debug View](../features/debug-view.md) for technical troubleshooting
- Check [Mobile Experience](../features/mobile.md) for device-specific guidance