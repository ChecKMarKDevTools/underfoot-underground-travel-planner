# Future Enhancements

This is a list of all design decisions I made throughout the process with a focus on time-savings or cost savings over the long term. For long-term stability and growth potential, these should probably be addressed first.

## Project/Code

- [ ] Python is really a better long-term choice for the backend, but JS is what I know _now_.
- [ ] Use a modular architecture to allow for easier updates and maintenance. I chose to keep it all in one place for easier development and deployment.
- [ ] Now that I have everything actually put together in this one monorepo, I'm not completely hating it. Now, if it becomes more than just me it could get complicated quickly, but for now It's working.
- [ ] As I pointed out in the blog submission for this hackathon, this really needs to be a mobile app to be effective in any way. Besides, I've been wanting to branch out into mobile for a while.

### UI Chat Interface - Custom

- [ ] I chose to stick with only dark mode to reduce complexity, overall, this could be enhanced along with actual styling (says the backend developer trying to write decent tailwind 😆)
- [ ] The logo needs some help. It looks fantastic at about 1200 pixels. It's been a while since I've seen a 1200 pixel sized logo in practice though 🤣

# BrightData/n8n Workflows

- [ ] Unlocker node should only be used when required. Right now, it's set up automatically for every request to eliminate pain points first and keeps complexity low.
- [ ] AI agents use simple memory that is not persistent and does not transfer between agents. This could use something like I've read as cache to give persistence along with historical context.
- [x] Results caching could be implemented to improve performance and reduce redundant processing and then provided as a tool to the chat agents for faster response times
- [ ] Implement scheduled workflow that periodically scans each cache and removes any events or attractions with an end date in the past. This would help keep the data fresh and relevant without manual intervention.
- [ ] Consider setting up asynchronous request via an API Web hook that notifies you when the request is complete
- [ ] Post-hackathon the question becomes "how do I actually support this thing realistically and financially", especially because my projects end up costing me a fortune if I'm not careful...
  - [ ] I'm thinking probably Google places API because I do have some bandwidth there without incurring additional fees.
  - [/]And honestly, I'd rather pay for it out-of-pocket before I would put up with any sort of billing implementation. Which is easy to say when your user base consists of exactly 0, but more than that could be complicated. 🫤

### Chat agent - Stonewalker

- [ ] Limited to a single intent output for simplicity, but data agent can handle multiple intents.
- [ ] Ideally is capable of expanding search results automatically to include a wider radius. If the initial search does not return adequate data. This is worked into the initial design, but ultimately, I decided it was too complex considering everything else on the list... 😱
- [ ] n8n was great — it made development easy and it was easy to test. **The whole thing was easy** but it's not realistic for a long-term solution — not for _this_ use case. So I'm going to look into custom agent options.
- [ ] Explore memory and ongoing conversations to see if it can really work as good as Copilot's docs says

### Google SERP flow

- [ ] Run the planner OpenAI call twice with small parameter changes (e.g., two temps 0.25 & 0.40) and union queries before discovery.
- [ ] Respect the deadline: have the agent pass deadlineTs and perCallMs hints into Unlocker so scrapes stop gracefully if you’re near the live chat SLA.
- [ ] Respect the limits input into the flow to reduce overall runtime.
- [ ] Fix the location Geo thing it was a free five minute search to get an API key so I will add them to the list; but right now we literally pass them the users text and grab whatever comes back. This design really needs some love.
- [ ] I've been trying to limit this to a Bright Data "light" version of the SERP with varying degrees of success. I still think it's too much for what I'm using it so it could use some alternative approaches.

### Facebook events - trigger scrape

- [ ] Events can sometimes return a low volume of results from discovery. We could improve the outlook by the pre-defining a map type data set that essentially provides SEO friendly synonyms. That way we're not dependent upon the user to know what they want to look for we handle that for them.

## Discord Notifications

- [ ] Currently, this is very much a manual process. It would be nice if users could respond to the bot directly inside of discord and take action without having to navigate and sign in separately.
- [ ] This notification has successfully let me know within .0126 seconds if the workflow failed again because there is a very fast little thing that happens just as soon as I hit send every time. I've gotta work on it.

---

_This document was generated with Verdent AI assistance._
