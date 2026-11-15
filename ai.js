// AI layer. Modes:
//  device – a small open model that runs in this tab through WebGPU. Private, no key, no limits.
//  key    – any OpenAI-compatible service with a free tier, using a key you paste (stored only in this browser).
//  cloud  – a keyless public service. It has a free-use limit and may refuse (HTTP 402); the app then falls back.
//  off    – the scripted reader in engine.js.
// In every mode the rules engine makes the decisions. The model reads, explains and answers questions.
const PERSONAS = [
  { id: 'maya', name: 'Maya', tag: 'Warm and reassuring', style: 'Warm and reassuring. You speak like a friend who has organised many family trips, in plain, kind language, and you mention what each person needs.', greet: 'Hi, I’m Maya. Tell me about the trip in your own words: where from, where to, how long, and who’s coming.', ack: 'Lovely, I’ve got that.' },
  { id: 'arjun', name: 'Arjun', tag: 'Brisk and practical', style: 'Brisk and practical. Short sentences. Lead with the decision and the number. No fluff.', greet: 'Arjun here. Give me the trip: from, to, days, who’s going.', ack: 'Done.' },
  { id: 'dadi', name: 'Dadi', tag: 'Gentle and old-school', style: 'Gentle and old-school, like advice from a wise grandmother. Simple words, a little humour, always thinking of the comfort of the elders and the children.', greet: 'Come, beta, tell me about the trip. Where from, where to, and who is coming?', ack: 'Achha, I have written it down.' }
];
const PRESETS = {
  Groq: { base: 'https://api.groq.com/openai/v1', model: 'llama-3.1-8b-instant', help: 'Free key at console.groq.com' },
  Gemini: { base: 'https://generativelanguage.googleapis.com/v1beta/openai', model: 'gemini-2.0-flash', help: 'Free key at aistudio.google.com' },
  OpenRouter: { base: 'https://openrouter.ai/api/v1', model: 'meta-llama/llama-3.3-70b-instruct:free', help: 'Free key at openrouter.ai (use a model ending in :free)' },
  Custom: { base: '', model: '', help: 'Any OpenAI-compatible endpoint' }
};
const store = { get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } } };
const AI = {
  mode: 'off', engine: null, lastError: '', deviceModel: '',
  cfg: store.get('ctp.ai', { preset: 'Groq', key: '', base: PRESETS.Groq.base, model: PRESETS.Groq.model }),
  persona: store.get('ctp.persona', { id: 'maya', name: 'Maya', style: PERSONAS[0].style, greet: PERSONAS[0].greet, ack: PERSONAS[0].ack }),
  setPersona(p) { this.persona = p; store.set('ctp.persona', p); },
  saveCfg() { store.set('ctp.ai', this.cfg); },
  get ready() { return this.mode === 'cloud' || (this.mode === 'key' && !!this.cfg.key) || (this.mode === 'device' && !!this.engine); },
  get label() { return { cloud: 'free keyless AI', key: 'AI (your key)', device: 'on-device AI' }[this.mode] || 'scripted reader'; },
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
  async post(url, headers, body, ms = 25000) {
    const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), ms);
    try {
      const res = await fetch(url, { method: 'POST', signal: ctl.signal, headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error('The AI service replied ' + res.status + (res.status === 402 ? ' (its free-use limit)' : res.status === 401 || res.status === 403 ? ' (check the key)' : res.status === 429 ? ' (too many requests)' : ''));
      const j = await res.json(); return (j.choices?.[0]?.message?.content || '').trim();
    } finally { clearTimeout(timer); }
  },
  async chat(system, user, opts = {}) {
    const messages = [{ role: 'system', content: system }, { role: 'user', content: user }], max = opts.max || 300;
    if (this.mode === 'device') {
      const r = await this.engine.chat.completions.create({ messages, temperature: 0.2, max_tokens: max, ...(opts.json ? { response_format: { type: 'json_object' } } : {}) });
      return r.choices[0].message.content.trim();
    }
    if (this.mode === 'key') return this.post(this.cfg.base.replace(/\/$/, '') + '/chat/completions', { Authorization: 'Bearer ' + this.cfg.key }, { model: this.cfg.model, messages, temperature: 0.3, max_tokens: max });
    return this.post('https://text.pollinations.ai/openai', {}, { model: 'openai', messages, temperature: 0.2, max_tokens: max, private: true });
  },
  parseJson(s) { const a = s.indexOf('{'), b = s.lastIndexOf('}'); if (a < 0 || b < 0) throw new Error('no json'); return JSON.parse(s.slice(a, b + 1)); },
  voice() { const p = this.persona; return `You are ${p.name}, the trip planner inside a travel app. Your manner: ${p.style} Stay in this manner, but never invent facts.`; },
  // Reads the traveller's message into a structured brief. If `current` is given, the message is an edit to it.
  async readBrief(text, base, current) {
    let sys = `You extract trip details from a traveller's message. Reply with JSON only, in this shape: {"destination": an Indian place name or null, "home_city": an Indian city name or null, "days": number or null, "budget_per_person": number or null, "households": [{"name": string, "city": an Indian city name or null, "members": [{"name": string, "age": number}]}]}. The first household is the writer's own and must include a member named "You". Group people who live together into one household. Guess sensible ages when none are given. Use real names when the writer gives them. Do not add people who are not mentioned.`;
    if (current) sys += ` The current brief is: ${JSON.stringify(current)}. The new message is an edit to it: add, remove or change people, places, days or budget, and return the WHOLE updated brief in the same shape. Keep everything the message does not change.`;
    const j = this.parseJson(await this.chat(sys, text, { json: true, max: 700 }));
    const hs = (j.households || []).filter(h => h && Array.isArray(h.members) && h.members.length).slice(0, 5).map((h, i) => ({
      id: 'h' + (i + 1), name: String(h.name || 'Household ' + (i + 1)).slice(0, 40), from: base ? base.home : current.households[0].city, fromRaw: String((i === 0 ? (j.home_city || h.city) : h.city) || '').trim().slice(0, 40) || null,
      members: h.members.slice(0, 8).map(m => ({ name: String(m.name || 'Guest').slice(0, 24), age: Math.min(95, Math.max(0, parseInt(m.age) || 30)) }))
    }));
    const count = hs.reduce((a, h) => a + h.members.length, 0);
    if (!hs.length || count < 1 || count > 24) throw new Error('unusable');
    const seen = new Set(); hs.forEach(h => h.members.forEach(m => { let n = m.name, k = 2; while (seen.has(n)) n = m.name + ' ' + k++; seen.add(n); m.name = n; }));
    const out = { households: hs }, to = String(j.destination || '').trim().slice(0, 40);
    if (to) out.toRaw = to;
    if (j.days >= 2 && j.days <= 7) out.days = Math.round(j.days);
    if (j.budget_per_person >= 5000 && j.budget_per_person <= 60000) out.cap = Math.round(j.budget_per_person / 500) * 500;
    return out;
  },
  summarise(facts) { return this.chat(this.voice() + ' Write to the person organising a group trip. In two short sentences, say why this plan suits these travellers. Use only the facts given. No greeting, no lists.', facts, { max: 120 }); },
  ask(question, facts) { return this.chat(this.voice() + ' Answer the traveller in at most three short sentences. Use only the facts below. If the facts do not cover the question, say what you do not know yet and what the traveller can change in the brief. Never invent prices, places or reviews.\n\nFACTS:\n' + facts, question, { max: 170 }); }
};
