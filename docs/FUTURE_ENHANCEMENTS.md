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
- Implement scheduled workflow that periodically scans each cache and removes any events or attractions with an end date in the past. This would help keep the data fresh and relevant without manual intervention.
- consider setting up asynchronous request via an API Web hook that notifies you when the request is complete

### Chat agent - Stonewalker

- Limited to a single intent output for simplicity, but data agent can handle multiple intents.
- ideally is capable of expanding search results automatically to include a wider radius. If the initial search does not return adequate data. This is worked into the initial design, but ultimately, I decided it was too complex considering everything else on the list... 😱

### Google SERP flow

- Run the planner OpenAI call twice with small parameter changes (e.g., two temps 0.25 & 0.40) and union queries before discovery.
- Respect the deadline: have the agent pass deadlineTs and perCallMs hints into Unlocker so scrapes stop gracefully if you’re near the live chat SLA.
- Respect the limits input into the flow to reduce overall runtime.

### Facebook events - trigger scrape

- Events can sometimes return a low volume of results from discovery. We could improve the outlook by the pre-defining a map type data set that essentially provides SEO friendly synonyms. That way we're not dependent upon the user to know what they want to look for we handle that for them.

## Discord Notifications

- Currently, this is very much a manual process. It would be nice if users could respond to the bot directly inside of discord and take action without having to navigate and sign in separately.
