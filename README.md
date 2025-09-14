# The Prospector — discover, curate, and act on the web’s most relevant events.

## Inspiration
The Prospector started from the need to surface timely, relevant events and content from scattered web sources — combining news, social, platform searches and local listings into a single discovery flow so users can find, save, and act on opportunities without hunting across many sites.

## What it does
- Aggregates events, news, and social content from multiple sources (Ticketmaster, Eventbrite, NewsAPI, GitHub, Reddit, local APIs) and synthesizes results.
- Enhances items with AI-driven analysis (categorization, relevance, urgency, confidence).
- Lets users save and star discoveries; saved items persist to MongoDB when available.
- Optional Google Calendar integration to add starred items as calendar events.
- Supports Google sign-in for fast authentication and secure session creation server-side.
- Provides a single-page UI for search, preview, and quick actions (star, save, export).
- Includes dev helpers (CSP relaxations and a GitHub proxy) to unblock third‑party integrations during local development.

## How we built it
- Backend: Node.js + Express, Passport session auth, Mongoose for MongoDB. Dev-friendly single-file server (`enhanced-server-apis.js`) included for quick local runs.
- Frontend: Single-file vanilla JS app (`simple-app.html`) that dynamically loads Google APIs, performs searches, and syncs favorites to the server.
- Integrations: NewsAPI, Ticketmaster, Eventbrite, API‑Ninja, OpenWeather, Reddit/GitHub scrapers, and Google Calendar.
- AI: Hooks for generative analysis used for categorization and recommendations where configured.

## Challenges we ran into
- Browser Content Security Policy (CSP) blocked third-party scripts and fetches during local testing.
- Google discovery and OAuth require correct Authorized JavaScript origins and API key setup in Google Cloud Console.
- Cross-origin cookies and session management required careful CORS and cookie configuration.
- Normalizing heterogeneous external data sources required robust fallback logic.

## Accomplishments that we're proud of
- Unified discovery pipeline that ranks and deduplicates multi-source results.
- Local-first UX: localStorage fallback with sync-on-login so guests can interact without losing data.
- Google Calendar integration and Google sign-in flow (client + server verification) implemented.
- Developer experience improvements: dev CSP middleware, a GitHub proxy, and debug endpoints.

## What we learned
- CSP, SameSite cookies, and OAuth origin settings are the most frequent integration blockers.
- Local-first designs speed up iteration and prevent lost user actions.
- Clear debug endpoints and server logs save hours when integrating many external APIs.

## What's next for THE PROSPECTOR
- Restore strict auth and ownership checks for production and gate testing relaxations behind an env flag.
- Finalize chat/personalization DB migration.
- Improve UI for calendar and favorites management, add sync indicators.
- Expand local venue APIs and add tests/CI for key routes.

---

## Quick start (local development)
1. Copy `.env.example` to `.env` and set API keys (Google, NewsAPI, Ticketmaster, Eventbrite, MongoDB URI, SESSION_SECRET).
2. Install dependencies:

```bash
npm install
```

3. Start dev server (runs the TypeScript server in development mode):

```bash
npm run dev
```

4. Open `http://localhost:3000` in your browser. For Google OAuth and Calendar to work, add `http://localhost:3000` to your project's Authorized JavaScript origins in the Google Cloud Console.

## Demo credentials
- Use `/api/test/create-demo-user` to create a demo user when MongoDB is configured.

## Markdown tips (learn more)
Text formatting

```
## Headline
**bold**
_ italics _
[link](http://foo.bar)
![Alt text](/path/to/img.jpg)
```

Code block example

```ruby
puts "Hello World!"
```

## LaTeX math tips (learn more)
Inline math: `\( ... \)`

Displayed math:

```
$$
... 
$$
```

---

## Notes
You recently added calendar integration, report features, and Google authentication; those are wired into the client and server (see `simple-app.html` and the server routes). If you'd like, I can add a concise "How to configure Google Cloud Console" section next, or commit a small `.env.example` with placeholder keys.
