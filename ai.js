// AI layer. Three modes:
//  cloud  – a free public AI service (Pollinations), no key needed. Your message is sent to that service.
//  device – a small open model that runs in this tab through WebGPU. Nothing leaves the device.
//  off    – the scripted reader in engine.js.
// In every mode the rules engine makes the decisions. The model reads, explains and answers questions.
const AI = {
  mode: 'cloud', engine: null, model: 'openai', lastError: '',
  get ready() { return this.mode === 'cloud' || (this.mode === 'device' && !!this.engine); },
  get label() { return this.mode === 'cloud' ? 'free cloud AI' : this.mode === 'device' ? 'on-device AI' : 'scripted reader'; },
  prefer: ['Qwen2.5-1.5B-Instruct-q4f16_1-MLC', 'Llama-3.2-1B-Instruct-q4f16_1-MLC', 'Llama-3.2-1B-Instruct-q4f32_1-MLC', 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC'],
  async loadDevice(onProgress) {
    if (!navigator.gpu) throw new Error('This browser has no WebGPU. Try a recent Chrome or Edge on a laptop.');
    const webllm = await import('https://esm.run/@mlc-ai/web-llm');
    const ids = webllm.prebuiltAppConfig.model_list.map(m => m.model_id);
    const model = this.prefer.find(m => ids.includes(m)) || ids.find(m => /1B|1\.5B|0\.5B/.test(m));
    if (!model) throw new Error('No small model is available.');
    this.engine = await webllm.CreateMLCEngine(model, { initProgressCallback: p => onProgress(p.progress || 0, p.text || '') });
    this.deviceModel = model;
  },
  async chat(system, user, opts = {}) {
    const messages = [{ role: 'system', content: system }, { role: 'user', content: user }];
    if (this.mode === 'device') {
      const r = await this.engine.chat.completions.create({ messages, temperature: 0.2, max_tokens: opts.max || 300, ...(opts.json ? { response_format: { type: 'json_object' } } : {}) });
      return r.choices[0].message.content.trim();
    }
    const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 25000);
    try {
      const res = await fetch('https://text.pollinations.ai/openai', { method: 'POST', signal: ctl.signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: this.model, messages, temperature: 0.2, max_tokens: opts.max || 300, private: true, ...(opts.json ? { response_format: { type: 'json_object' } } : {}) }) });
      if (!res.ok) throw new Error('The AI service replied ' + res.status);
      const j = await res.json(); return (j.choices?.[0]?.message?.content || '').trim();
    } finally { clearTimeout(timer); }
  },
  parseJson(s) { const a = s.indexOf('{'), b = s.lastIndexOf('}'); if (a < 0 || b < 0) throw new Error('no json'); return JSON.parse(s.slice(a, b + 1)); },
  // Reads the traveller's message into a structured brief. The result is validated before use.
  async readBrief(text, base) {
    const sys = `You extract trip details from a traveller's message. Reply with JSON only, in this shape: {"destination": one of [${Object.keys(DEST).join(', ')}] or null, "home_city": one of [${Object.keys(CITIES).join(', ')}] or null, "days": number or null, "budget_per_person": number or null, "households": [{"name": string, "city": one of the home cities or null, "members": [{"name": string, "age": number}]}]}. The first household is the writer's own and must include a member named "You". Group people who live together into one household. Guess sensible ages when none are given. Use real names when the writer gives them. Do not add people who are not mentioned.`;
    const j = this.parseJson(await this.chat(sys, text, { json: true, max: 600 }));
    const pick = (v, list) => v && list.find(n => n.toLowerCase() === String(v).toLowerCase());
    const home = pick(j.home_city, Object.keys(CITIES)) || base.home;
    const hs = (j.households || []).filter(h => h && Array.isArray(h.members) && h.members.length).slice(0, 5).map((h, i) => ({
      id: 'h' + (i + 1), name: String(h.name || 'Household ' + (i + 1)).slice(0, 40), from: i === 0 ? home : (pick(h.city, Object.keys(CITIES)) || home),
      members: h.members.slice(0, 8).map(m => ({ name: String(m.name || 'Guest').slice(0, 24), age: Math.min(95, Math.max(0, parseInt(m.age) || 30)) }))
    }));
    const count = hs.reduce((a, h) => a + h.members.length, 0);
    if (!hs.length || count < 1 || count > 24) throw new Error('unusable');
    const seen = new Set(); hs.forEach(h => h.members.forEach(m => { let n = m.name, k = 2; while (seen.has(n)) n = m.name + ' ' + k++; seen.add(n); m.name = n; }));
    const out = { households: hs }, to = pick(j.destination, Object.keys(DEST));
    if (to) { out.to = to; out.guessedTo = false; }
    if (j.days >= 2 && j.days <= 7) out.days = Math.round(j.days);
    if (j.budget_per_person >= 5000 && j.budget_per_person <= 60000) out.cap = Math.round(j.budget_per_person / 500) * 500;
    return out;
  },
  summarise(facts) { return this.chat('You are a travel planner writing to the person who is organising a group trip. In two short, plain sentences, say why this plan suits these travellers. Use only the facts given. No greeting, no lists, no invented details.', facts, { max: 110 }); },
  ask(question, facts) { return this.chat('You are the AI trip planner inside a travel app. Answer the traveller in at most three short, plain sentences. Use only the facts below. If the facts do not cover the question, say what you do not know yet and what the traveller can change in the brief. Never invent prices, places or reviews.\n\nFACTS:\n' + facts, question, { max: 160 }); }
};
