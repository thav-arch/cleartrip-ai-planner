# AI trip planner · Cleartrip concept

A working prototype for a design assignment: an AI travel agent that plans one trip around every person and helps every household agree. Not affiliated with Cleartrip. All trains, flights, stays and prices are invented, and nothing is booked or charged.

## Run it
Open `index.html` in a browser. There is no build step and no server.

## Host it on GitHub Pages
1. Create a repository and push these files to the `main` branch.
2. In the repository, open Settings → Pages, choose "Deploy from a branch", pick `main` and `/ (root)`, and save.
3. The site appears at `https://<your-username>.github.io/<repo-name>/` after a minute.

## How it works
- `data.js` holds the made-up inventory.
- `engine.js` is the rules engine. It reads the trip brief and decides what fits: no early starts for young children, lower berths and step-free stays for anyone who needs them, and nothing above the budget cap.
- `ai.js` loads a small open model with WebLLM and runs it in the browser tab through WebGPU. There is no API key and nothing leaves the device. The model reads the traveller's message into a brief and writes a short plan summary. Its output is validated, and the rules engine still makes every decision.
- `app.js` draws the screens and runs the flow.

## On-device AI: what to expect
- It needs a recent Chrome or Edge on a laptop or desktop with WebGPU. It is unreliable on phones.
- The first load downloads roughly 1 GB and is cached afterwards.
- If the model can't load, the scripted reader in `engine.js` does the same job, so the prototype always works.
