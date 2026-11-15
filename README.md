# AI trip planner · Cleartrip concept

A working prototype for a design assignment: an AI travel agent that plans one trip around every person and helps every household agree. Not affiliated with Cleartrip. All trains, flights, stays and prices are invented, and nothing is booked or charged.

## Run it
Open `index.html` in a browser. There is no build step and no server.

## Host it on GitHub Pages
1. Create a repository and push these files to the `main` branch.
2. In the repository, open Settings → Pages, choose "Deploy from a branch", pick `main` and `/ (root)`, and save.
3. The site appears at `https://<your-username>.github.io/<repo-name>/` after a minute.

## How it works
- `data.js` generates made-up routes and stays for 9 origin cities and 6 destinations.
- `engine.js` is the rules engine. It reads the trip brief and decides what fits: no early starts for young children, lower berths and step-free stays for anyone who needs them, and nothing above the budget cap.
- `ai.js` is the AI layer. The model reads the traveller's message into a brief, writes a short plan summary and answers questions about the plan. Its output is validated, and the rules engine still makes every decision.
- `app.js` draws the screens and runs the flow.

## The three AI modes
- **Free cloud AI (default):** calls Pollinations, a free public AI service that needs no key. Messages are sent to that service, so don't type private details. It can be slow or unavailable; the app then falls back to the scripted reader.
- **On-device AI:** loads a small open model with WebLLM and runs it in the tab through WebGPU. Nothing leaves the device. It needs a recent Chrome or Edge on a laptop and a one-time download of roughly 1 GB.
- **No AI:** a scripted reader. Always works, including offline.

## What a real product would still need
Live inventory and prices from booking partners, real accounts and sharing between households, payments, and an AI service with a contract behind it. None of that is in this prototype.
