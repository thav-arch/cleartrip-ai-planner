// On-device AI: a small open model that runs in this browser tab through WebGPU.
// No server and no API key. If it can't load, the app keeps working with the scripted reader.
const AI = {
  ready: false, engine: null, model: null,
  prefer: ['Qwen2.5-1.5B-Instruct-q4f16_1-MLC', 'Llama-3.2-1B-Instruct-q4f16_1-MLC', 'Llama-3.2-1B-Instruct-q4f32_1-MLC', 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC'],
  async load(onProgress) {
    if (!navigator.gpu) throw new Error('This browser has no WebGPU. Try a recent Chrome or Edge on a laptop.');
    const webllm = await import('https://esm.run/@mlc-ai/web-llm');
    const ids = webllm.prebuiltAppConfig.model_list.map(m => m.model_id);
    this.model = this.prefer.find(m => ids.includes(m)) || ids.find(m => /1B|1\.5B|0\.5B/.test(m));
    if (!this.model) throw new Error('No small model is available.');
    this.engine = await webllm.CreateMLCEngine(this.model, { initProgressCallback: p => onProgress(p.progress || 0, p.text || '') });
    this.ready = true;
  },
  async chat(system, user, opts = {}) {
    const r = await this.engine.chat.completions.create({ messages: [{ role: 'system', content: system }, { role: 'user', content: user }], temperature: 0.2, max_tokens: opts.max || 300, ...(opts.json ? { response_format: { type: 'json_object' } } : {}) });
    return r.choices[0].message.content.trim();
  },
  // Reads the traveller's message into a structured brief. The result is validated before use.
  async readBrief(text) {
    const sys = 'You extract trip details. Reply with JSON only, in this shape: {"days": number, "budget_per_person": number or null, "households": [{"name": string, "travels_from_another_city": boolean, "members": [{"name": string, "age": number}]}]}. The first household is the writer\'s own and must include a member named "You". Group people who live together. Guess sensible ages when none are given. Do not add people who are not mentioned.';
    const j = JSON.parse(await this.chat(sys, text, { json: true, max: 500 }));
    const hs = (j.households || []).filter(h => h && Array.isArray(h.members) && h.members.length).slice(0, 5).map((h, i) => ({
      id: 'h' + (i + 1), name: String(h.name || 'Household ' + (i + 1)).slice(0, 40), from: i > 0 && h.travels_from_another_city ? DATA.remote : DATA.home,
      members: h.members.slice(0, 8).map(m => ({ name: String(m.name || 'Guest').slice(0, 24), age: Math.min(95, Math.max(0, parseInt(m.age) || 30)) }))
    }));
    const count = hs.reduce((a, h) => a + h.members.length, 0);
    if (!hs.length || count < 1 || count > 24) throw new Error('unusable');
    const seen = new Set(); hs.forEach(h => h.members.forEach(m => { let n = m.name, k = 2; while (seen.has(n)) n = m.name + ' ' + k++; seen.add(n); m.name = n; }));
    const out = { households: hs };
    if (j.days >= 2 && j.days <= 7) out.days = Math.round(j.days);
    if (j.budget_per_person >= 5000 && j.budget_per_person <= 60000) out.cap = Math.round(j.budget_per_person / 500) * 500;
    return out;
  },
  async summarise(facts) {
    return this.chat('You are a travel planner writing to a family. In two short, plain sentences, say why this plan suits them. Use only the facts given. No greetings, no lists, no prices that are not given.', facts, { max: 90 });
  }
};
