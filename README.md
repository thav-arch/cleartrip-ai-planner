# AI trip planner · Cleartrip concept

A working prototype for a design assignment: an AI travel agent that plans one trip around every person and helps every household agree. Not affiliated with Cleartrip. All trains, flights, stays and prices are invented, and nothing is booked or charged.

## Run it
Open `index.html` in a browser. There is no build step and no server.

## Host it on GitHub Pages
1. Create a repository and push these files to the `main` branch.
2. In the repository, open Settings → Pages, choose "Deploy from a branch", pick `main` and `/ (root)`, and save.
3. The site appears at `https://<your-username>.github.io/<repo-name>/` after a minute.

## How it works
- `data.js` generates estimated fares and times for any pair of Indian places, plus sample stays used as a fallback.
- `places.js` looks up any Indian place with Nominatim and fetches real stays and sights from OpenStreetMap through the Overpass API (free, no key). Place data © OpenStreetMap contributors.
- `engine.js` is the rules engine. It reads the trip brief and decides what fits: no early starts for young children, lower berths and step-free stays for anyone who needs them, and nothing above the budget cap.
- `ai.js` is the AI layer. The model reads the traveller's message into a brief, writes a short plan summary and answers questions about the plan. Its output is validated, and the rules engine still makes every decision.
- `app.js` draws the screens and runs the flow.

## AI choices and the planner's personality
- **On-device AI:** loads a small open model with WebLLM and runs it in the tab through WebGPU. Private, no key, no limits. Needs a recent Chrome or Edge on a laptop and a one-time download of roughly 1 GB.
- **Your own free key:** paste a key from Groq, Google Gemini, OpenRouter or any OpenAI-compatible service. The key is stored only in your browser (localStorage) and sent only to that service. Check each provider's current free-tier terms.
- **Keyless public AI:** needs no setup but has a free-use limit and often refuses (HTTP 402). The app then falls back to the scripted reader.
- **No AI:** a scripted reader that also understands simple edits ("add my sister Riya, 30"). Always works, including offline.
- **Personality:** choose Maya (warm), Arjun (brisk), Dadi (gentle) or write your own. It changes the greeting, the plan summary and the answers to your questions.

## What a real product would still need
Live fares, seat availability and room prices from booking partners (no free source exists for these, so they are estimates), real accounts and sharing between households, payments, and an AI service with a contract behind it. None of that is in this prototype.
