# Future Enhancements

This is a list of all design decisions I made throughout the process with a focus on time-savings or cost savings over the long term. For long-term stability and growth potential, these should probably be addressed first.

## Project/Code

- Python is really a better long-term choice for the backend, but JS is what I know _now_.
- Use a modular architecture to allow for easier updates and maintenance. I chose to keep it all in one place for easier development and deployment.

### UI Chat Interface - Custom

- I chose to stick with only dark mode to reduce complexity, overall, this could be enhanced along with actual styling (says the backend developer trying to write decent tailwind 😆)

# BrightData/n8n Workflows

- Unlocker node should only be used when required. Right now, it's set up automatically for every request to eliminate pain points first and keeps complexity low.
- AI agents use simple memory that is not persistent and does not transfer between agents. This could use something like I've read as cache to give persistence along with historical context.
- Results caching could be implemented to improve performance and reduce redundant processing and then provided as a tool to the chat agents for faster response times
