# The Prospector

A Wild West themed web app for prospecting treasures in indie games, collectibles, open-source projects, and unique hobbies.

## Tech Stack
- **Frontend:** Next.js + TailwindCSS
- **Backend:** Express.js + SQLite
- **Scraper Service:** Python (BeautifulSoup/Playwright)
- **AI Layer:** Gemini API (Google AI Studio)
- **Database:** SQLite

## Project Structure
```
the-prospector/
  ├── backend_express/      # Express.js API + SQLite
  ├── frontend_next/        # Next.js + TailwindCSS UI
  ├── scraper_service/      # Python scrapers
  └── README.md
```

## Setup Instructions

### 1. Backend (Express + SQLite)
```sh
cd the-prospector/backend_express
npm install
npm start
```
API runs at `http://localhost:8001`

### 2. Frontend (Next.js + Tailwind)
```sh
cd the-prospector/frontend_next
npm install
npm run dev
```
App runs at `http://localhost:3000`

### 3. Python Scraper Service
```sh
cd the-prospector/scraper_service
python3 scraper.py gamers "indie games"
```

## Features & TODOs
- Interactive treasure map UI
- Search/prospect for games, collectibles, jobs, projects
- Stake a claim (save search)
- AI summarization & ranking (Gemini API)
- User accounts & claim management
- Mobile responsive, sepia/rustic theme
- Advanced analytics & gamification

## Workflow Diagram
```
[User] → [Next.js UI] → [Express API] → [Python Scraper] → [Gemini AI] → [SQLite DB]
```

## Advanced Features
- Animated nugget cards, map pins, dark mode
- AI-powered recommendations & search suggestions
- Caching, error handling, background jobs
- Portfolio-ready documentation & code quality

---

Hackathon 2025 — Build fast, strike gold!
