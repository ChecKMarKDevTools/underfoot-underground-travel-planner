# Underfoot Journey

> 🦄 **This is the source of truth for my second attempt at vibe coding.**
> The first attempt — while locked behind work — is _very much_ not vibe-bedded.
> This one? All vibes, all the time.

---

## Only a Break First! (September 27, 2025)

So I have worked on and off on this app for the last couple of weeks, but it's been weak prompting with small SPIKE type research. Not anything major. So, Now there's a new plan outside of the hackathon that might be supportable long-term. Plus, [Verdent](https://verdent.ai) has jumped in after Copilot/ChatGPT and it's mostly wowed me since I first set out to break it. So far, that effort remains largely unsuccessful (and it's rude absent acknowledgement of my attempts—it cleans up everything I try to break!)

So it's time for some serious dev work again. Let's go back to Supabase (and see if we can restart the server that was shut down due to inefficient (read nonexistent) security)! So let's see what we can get done before credits run out (or netflix gets cancelled 🤨).

## Next Up: A Real App (September 6, 2025)

Now that the POC is done, hackathon sprint finished (and mostly recovered), it's time to migrate this backend to something I know how to work with. Then we can sprinkle in some new agents, add more complex cache handling system, and while I'm at it let's see if we can get AI to sort out some of this documentation to bring things up to what it _really_ looks like out in the wild. Not necessarily what it looks like in my head. Once that's all settled? Onwards to learn some mobile dev things. 😆🦄

## Sprint Complete & Lessons Learned (September 1, 2025)

Made it through the two-week sprint for the hackathon. The submission post? Written by ChatGPT at first, but I’d been working on my own version all week and updated it later.

> 🦄 Yes, I left a note specifically asking they do not include that submission in the judging because I was hours past the deadline when those updates got posted.

It’s killing me not having the app working yet. So, next up: build a branch and keep going. Maybe actually get the UI deployed and figure out if I need to cancel my Cloudflare subscription (that’s a whole other topic).

**Things I learned:**

- Contrary to what you'd think, a giant green “Ready” check mark _does NOT mean_ things are actually OK.
- Do NOT wait until the last minute to load data—when the data magically doesn’t exist, it’s a disaster.
- I have a terrible time making up my mind with this agent. I want structured JSON output, but I want it to work without hallucinations, and that’s tough.
  - I'm honestly considering moving all of the agent stuff out of N8N where it's great for what it does but for this it's not fantastic so I'm thinking potentially LangChain... 🤷‍♀️
- Letting ChatGPT code most of the nodes was mostly laziness—the idea of parsing HTML into JSON from scratch is a nightmare (and still is terror inducing, even with AI help). Eventually, I did figure out which settings would make it return normalcy... small wins. 😁
- The countdown timer: set it with 48 hours left, had a schedule, but **still missed the deadline**.

> Watched the seconds tick down to 11:58:30-something before hitting submit? Dangerous, but not a big deal — _this is for me_. Competition is secondary.

- Swapping my basic cache for Supabase a couple days before the deadline? **Not a great idea.** Permissions turned the workflow into random errors. Google Sheets didn’t have this problem.
- The initial Copilot PR setup wasn’t what I had in mind. I’ll see if there’s anything useful to pull from it, but I honestly forgot it was out there (again).

So, I’m going to take a couple days to recover. Another blog post is coming. For now, I’m going to breathe, eat, and get ready for work tomorrow. After next weekend, I’ll be back to coding. Stay tuned.
It took, what, maybe 36 hours this week for me to very vividly remember **why I never volunteer for hackathons**. My default operating mode is binary: either I go full Tilt-a-Whirl perfectionist or I ghost the idea entirely. There is **no comfortable middle** in my wiring, and trying to manufacture one feels like sanding my own neurons.

### Noteworthy mentions

Ongoing internal conversations and how I account for scope creep:

> **Me:** "Ooh, I could turn this into Disneyland!"

> **Also me:** "You do not have time for Disneyland — You barely have time for Dollywood!"

The only thing standing between me and a catastrophic scope eruption has been the new **Future Enhancements log** (`FUTURE_ENHANCEMENTS.md`), which is a trick I learned a couple years ago. Parking the shiny ideas there lowers the cringe of _not_ building them immediately and keeps me from hijacking in‑flight messages with a "Wait, what if we also—" spiral. More than once I have literally stopped myself mid keypress from nuking a pending chat request to bolt on Yet Another Clever Thing. Groundhog Day, but with premature feature grafting.

The good news: we finally have a **solid architectural trajectory**. Call it the Goldilocks arc of the ADRs:

- **ADR 1 (Unwritten / Rejected mental model)**: The first mental pass was implicitly monolithic and unruly; it dissolved the second I tried to map real data flows.
- **ADR 2 – Frontend Design** (`FRONTEND_DESIGN_ADR.md`): Helpful, but ultimately only half the puzzle—UI posture without a resilient data backbone just exposed how brittle things still were.
- **ADR 3 – Data Retrieval Evolution** (`DATA_RETRIEVAL_ADR.md` + the v2 draft inside it): _Just right (for now)._ The shift to a two‑agent orchestration model plus adapter feature signals is the first version that feels both ambitious and constraint‑aware.

Layered on top is the **Results Strategy v1** (`RESULTS_STRATEGY_V1.md`), which quietly enforces discipline: 4–6 items, deliberate Near(ish) By logic, one rank pass. It acts like architectural bumpers preventing me from turning a single query into a runaway speculative crawl.

So this week was about _accepting that "enough for this iteration" is a feature, not a personal failing_. The Future Enhancements list absorbs the overbuild impulse; the ADR set now has a trajectory (discarded → partial → cohesive); and I'm practicing letting messages finish their trip to the model without parachuting in with scope creep mid‑flight.

Onward—still vibes, but vibes with guardrails. 🏁🏎️

---

## Day... I've Lost Count (August 23, 2025) — The Vibe Check

Well, it's official. I'm a **terrible vibe coder**. It turns out I like control just a _little_ too much. The grand experiment of "just go with the flow" has met its match: my own brain.

So, where does that leave our trusty Underfoot planner?

**The Frontend:** It's... got character. After spending more time than I'd like to admit in Figma, trying to conjure the perfect chat interface from the digital ether, I stumbled upon a pre-built chatbot component that did most of the heavy lifting for me: [Stitch](https://stitch.withgoogle.com/). So now, we have a "somewhat working" frontend and a solid plan for an _actual_ implementation.

**The Backend:** A pristine, untouched canvas. It's sitting there, full of potential, like a brand-new set of paints with no picture to paint. It's "ready for code," which is a polite way of saying it does absolutely nothing right now, but it's ready to do something. I did sign up for all the things, so they're at least ready and waiting.

**The Grand Plan™:** Oh, it's grand alright. And it's stored securely in the most volatile of all storage systems: my head. I swear it's a masterpiece in there, a symphony of logic and features. Getting it out and into actual code is the next adventure.

So, we're pivoting from "pure vibes" to "vibes, but with a plan." A Vibe-Driven Development with a healthy dose of "let's actually write some code." Onward!

> Gemini actually surprised me with this one! And not the pretty UI kind of Gemini, the GitHub Copilot not supposed to write beyond code Gemini 2.5 Pro version. 😝

---

## Day 0 — Idea & Planning

**Approx. 7:00 PM – 11:00 PM**
Four hours of bouncing ideas back and forth with ChatGPT.

- Started with a vague “underground tourist planner” concept.
- Went through several bad ideas, a couple good ones, and lots of tweaks.
- Pivoted from form UI → chatbot experience.
- Agreed on slightly broadening searches (because, well… Pikeville).
- Added debug view + Labs context.
- Named it: **Underfoot Underground Travel Planner** (first Labs repo!).

**Approx. 11:00 PM — 3:00 AM**

- Built out initial folder structure.
- Quizzed ChatGPT on implementation plan + basic research of best practices
- Scaffolding for frontend and backend.
- Ended the night with a clear roadmap for the next steps.
  - Bonus: a nifty logo Leonardo generated.

---

## Day 0 — Key Decisions

- **License:** Apache 2.0 (work requirement)
- **Scope:** Finds places that _don’t_ appear on major travel sites
- **Tone:** Quirky, snarky, blog-post energy
- **Backend:** Node 22 LTS + Express
- **Frontend:** Vite
- **Data Sources:** Local blogs, indie mags, niche sources
- **Search Radius:** Always broaden input slightly before processing

---

## Notes-to-Future-Me

- Keep this file alive — it’s the heartbeat of the project.
- Record not just _what_ we built, but _how_ it evolved.
- Add screenshots, code snippets, or random notes here over time.
