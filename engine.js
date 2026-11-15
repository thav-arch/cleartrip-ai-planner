// Rules engine: the part that decides. The AI model only reads and explains.
const Engine = {
  cap(s) { return s.replace(/\b\w/g, c => c.toUpperCase()); },
  find(text, names) { const t = text.toLowerCase(); return names.map(n => ({ n, i: t.search(new RegExp('\\b' + n.toLowerCase() + '\\b')) })).filter(x => x.i >= 0).sort((a, b) => a.i - b.i).map(x => x.n); },

  // Scripted reader, used when the on-device model is off or fails.
  parse(text) {
    let t = text.toLowerCase().replace(/\bbangalore\b/g, 'bengaluru').replace(/\bbombay\b/g, 'mumbai').replace(/\b(kerala|cochin)\b/g, 'kochi').replace(/\b(pondy|puducherry)\b/g, 'pondicherry').replace(/\bcalcutta\b/g, 'kolkata');
    const dests = this.find(t, Object.keys(DEST)), cities = this.find(t, Object.keys(CITIES));
    const fromM = t.match(/from\s+([a-z]+)/), home = (fromM && cities.find(c => c.toLowerCase() === fromM[1])) || cities[0] || 'Bengaluru';
    const remote = cities.find(c => c !== home) || (home === 'Delhi' ? 'Mumbai' : 'Delhi');
    const days = Math.min(7, Math.max(2, parseInt((t.match(/(\d+)\s*-?\s*(day|night)/) || [])[1] || 5)));
    const you = { id: 'h1', name: 'Your household', from: home, members: [{ name: 'You', age: 34 }] };
    if (/(wife|husband|partner|spouse)/.test(t)) you.members.push({ name: 'Partner', age: 35 });
    const kids = [...t.matchAll(/(\d+)\s*-?\s*(?:year|yr)s?\s*-?\s*old/g)].map(m => +m[1]).filter(a => a < 18);
    kids.forEach((a, i) => you.members.push({ name: kids.length > 1 ? 'Child ' + (i + 1) : 'Child', age: a }));
    if (!kids.length && /\b(son|daughter|kid|kids|children|toddler|baby)\b/.test(t)) you.members.push({ name: 'Child', age: 5 });
    const hs = [you];
    if (/(grandparents|grandma|grandpa|grandmother|grandfather)/.test(t)) hs.push({ id: 'h2', name: 'Grandparents', from: home, members: [{ name: 'Grandma', age: 72 }, { name: 'Grandpa', age: 75 }] });
    else if (/(parents|mom|mum|mother|dad|father|in-laws)/.test(t)) hs.push({ id: 'h2', name: 'Your parents', from: home, members: [{ name: 'Mom', age: 65 }, { name: 'Dad', age: 68 }] });
    const rel = (t.match(/(brother|sister|cousin|uncle|aunt)/) || [])[1];
    if (rel) { const R = this.cap(rel); hs.push({ id: 'h3', name: R + '’s household', from: remote, members: [{ name: R, age: 38 }, { name: R + '’s partner', age: 36 }, { name: R + '’s child', age: 8 }] }); }
    const fr = t.match(/(\d+)\s*friends/);
    if (fr) hs.push({ id: 'h4', name: 'Friends', from: home, members: Array.from({ length: Math.min(8, +fr[1]) }, (_, i) => ({ name: 'Friend ' + (i + 1), age: 30 })) });
    const b = t.match(/(?:₹|rs\.?|inr)\s*([\d,.]+)\s*(k)?/) || t.match(/([\d,.]+)\s*(k)\b/);
    let cap = 15000; if (b) { const v = parseFloat(b[1].replace(/,/g, '')) * (b[2] ? 1000 : 1); if (v >= 5000 && v <= 60000) cap = Math.round(v / 500) * 500; }
    return { to: dests[0] || 'Goa', guessedTo: !dests.length, home, remote, days, cap, households: hs };
  },


  // Scripted edits for follow-up messages when no AI is available. Returns a short message if it could not act.
  edit(S, text) {
    const t = text.trim(), low = t.toLowerCase(), before = JSON.stringify(S.households) + S.days + S.cap;
    const REL = { wife: 33, husband: 35, partner: 33, son: 8, daughter: 8, kid: 8, child: 8, mother: 62, mom: 62, father: 65, dad: 65, brother: 32, sister: 32, friend: 30, cousin: 28, uncle: 55, aunt: 52, grandmother: 72, grandfather: 75, grandma: 72, grandpa: 75 };
    const STOP = new Set(['a', 'an', 'my', 'member', 'person', 'someone', 'another', 'one', 'more', 'to', 'the', 'i', 'can', 'also', 'please', 'age', 'aged']);
    const used = () => new Set(this.people(S).map(p => p.name.toLowerCase()));
    const uniq = n => { let x = n, k = 2; while (used().has(x.toLowerCase())) x = n + ' ' + k++; return x; };
    const m = t.match(/\b(?:add|include|bring)\s+(?:in\s+)?(?:my\s+|a\s+|an\s+)?(?:(wife|husband|partner|son|daughter|kid|child|mother|mom|father|dad|brother|sister|friend|cousin|uncle|aunt|grandmother|grandfather|grandma|grandpa)\s+)?([A-Za-z]+)?[\s,]*(?:aged?\s*)?(\d{1,2})?\b/i);
    if (m && /\b(add|include|bring)\b/i.test(t)) {
      let rel = (m[1] || '').toLowerCase(), name = m[2] && !STOP.has(m[2].toLowerCase()) && !REL[m[2].toLowerCase()] ? m[2] : '';
      if (!rel && m[2] && REL[m[2].toLowerCase()]) rel = m[2].toLowerCase();
      if (!name && !rel) return { msg: 'Who should I add? Say a name and age, like “add my sister Riya, 30”, or use the form below.' };
      name = this.cap(name || rel); const age = m[3] ? Math.min(95, +m[3]) : (REL[rel] || 30);
      if (this.people(S).length >= 24) return { msg: 'That’s the most people I can plan for in one trip.' };
      const eld = /^(mother|mom|father|dad|grandmother|grandfather|grandma|grandpa)$/.test(rel), sib = /^(brother|sister|cousin|uncle|aunt)$/.test(rel);
      let h = eld ? S.households.find(x => x.name === 'Your parents' || x.name === 'Grandparents') : S.households[0];
      if (eld && !h) { h = { id: 'h' + (S.households.length + 1), name: /grand/.test(rel) ? 'Grandparents' : 'Your parents', from: S.households[0].from, members: [] }; S.households.push(h); }
      if (sib) { h = { id: 'h' + (S.households.length + 1), name: name + '’s household', from: S.households[0].from, members: [] }; S.households.push(h); }
      h.members.push({ name: uniq(name), age });
    } else if (/\b(remove|delete|drop)\b/i.test(t)) {
      const w = (t.match(/\b(?:remove|delete|drop)\s+(?:my\s+)?([A-Za-z]+)/i) || [])[1];
      const h = S.households.find(x => x.members.some(p => p.name.toLowerCase() === (w || '').toLowerCase()));
      if (!h) return { msg: 'I couldn’t find that person. Use the × next to a name below.' };
      if (this.people(S).length <= 1) return { msg: 'At least one traveller has to stay.' };
      h.members = h.members.filter(p => p.name.toLowerCase() !== w.toLowerCase()); if (!h.members.length && h.id !== 'h1') S.households = S.households.filter(x => x !== h);
    }
    const d = low.match(/(\d+)\s*-?\s*(day|night)/); if (d && +d[1] >= 2 && +d[1] <= 7) S.days = +d[1];
    const b = low.match(/(?:₹|rs\.?|inr|budget\D{0,12})\s*([\d,.]+)\s*(k)?/); if (b) { const v = parseFloat(b[1].replace(/,/g, '')) * (b[2] ? 1000 : 1); if (v >= 5000 && v <= 60000) S.cap = Math.round(v / 500) * 500; }
    return JSON.stringify(S.households) + S.days + S.cap !== before ? {} : { msg: 'I couldn’t tell what to change. Try “add my sister Riya, 30”, “remove Riya”, “make it 6 days”, or use the form below.' };
  },

  people(S) { return S.households.flatMap(h => h.members.map(m => ({ ...m, h: h.id }))); },
  isRemote(S, h) { return h.from !== S.households[0].from; },
  rooms(h) { return Math.ceil(h.members.length / 3); },
  nights(S, h) { return S.remoteShort && this.isRemote(S, h) ? Math.max(1, S.days - 3) : S.days - 1; },
  fmt(n) { return '₹' + Math.round(n).toLocaleString('en-IN'); },
  base: (() => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + 30); while (d.getDay() !== 2) d.setDate(d.getDate() + 1); return d; })(),
  date(S, offset) { const d = new Date(this.base); d.setDate(d.getDate() + (S.shift ? 2 : 0) + offset); return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }); },

  plan(S) {
    const steps = [], ppl = this.people(S), legs = [], D = DEST[S.to];
    const smallKids = ppl.filter(p => p.age < 10), access = ppl.filter(p => S.access.includes(p.name));
    let seen = 0, cutEarly = 0;
    for (const city of [...new Set(S.households.map(h => h.from))]) {
      const hh = S.households.filter(h => h.from === city), mem = hh.flatMap(h => h.members), R = DATA.route(city, S.to);
      let opts = R.opts; seen += opts.length;
      const kids = mem.filter(m => m.age < 10), needs = mem.filter(m => S.access.includes(m.name)), why = [];
      if (kids.length) { const keep = opts.filter(o => o.depHour >= 8); if (keep.length) { cutEarly += opts.length - keep.length; opts = keep; why.push('no start before 8 am for ' + kids.map(k => k.name).join(' and ')); } }
      if (needs.length) { const keep = opts.filter(o => !o.hardForElders && (o.mode !== 'train' || o.lowerBerths)); if (keep.length) { opts = keep; why.push(opts.some(o => o.lowerBerths) ? 'lower berths available for ' + needs.map(k => k.name).join(' and ') : 'no sleeper bus for ' + needs.map(k => k.name).join(' and ')); } }
      const short = opts.filter(o => o.hrs <= 16); if (short.length && short.length < opts.length) { opts = short; why.push('no journey over 16 hours'); }
      const forced = S.forceLeg && S.forceLeg[city];
      const pick = (forced && R.opts.find(o => o.id === forced)) || opts.slice().sort((a, b) => a.price - b.price)[0];
      legs.push({ city, hh, count: mem.length, km: R.km, opt: pick, all: R.opts, why: forced ? 'you chose this after the earlier option sold out' : (why.length ? why.join('; ') : 'the cheapest option that fits') });
    }
    steps.push({ t: `Checked ${seen} trains, buses and flights to ${S.to}` });
    if (cutEarly) steps.push({ t: `Removed ${cutEarly} starts before 8 am`, who: smallKids.map(k => k.name).join(', ') });
    let stays = DATA.stays(S.to); const real = !!(stays[0] && stays[0].real);
    steps.push({ t: real ? `Looked up ${stays.length} real stays near ${S.to} on OpenStreetMap` : `Used sample stays near ${S.to}: live listings weren’t reachable` });
    if (access.length) { const b = stays.length; stays = stays.filter(s => s.groundFloor || s.lift || s.stepUnknown); { const unk = stays.filter(x => x.stepUnknown).length; steps.push({ t: unk ? `Kept ${stays.length} of ${b} stays: ${stays.length - unk} listed as step-free, ${unk} not listed (ask them)` : `Kept ${stays.length} of ${b} stays with step-free rooms`, who: access.map(a => a.name).join(', ') }); } }
    const quietWanted = S.vibe !== 'Party';
    const score = s => (s.rating ? s.rating * 10 : 40 + (s.stars || 3) * 2) + (s.hostYears ? Math.min(s.hostYears, 10) : 0) + (s.reviews ? Math.log10(s.reviews) * 4 : 0) + (s.groundFloor ? 4 : 0) - (s.stepUnknown && access.length ? 3 : 0) + (s.quiet === undefined ? 0 : quietWanted === s.quiet ? 6 : -6) + (smallKids.length && s.kidsPool ? 4 : 0) + (S.veg && s.veg ? 3 : 0) - s.far / 6 - s.room / 400;
    stays = stays.map(s => ({ ...s, score: score(s), reasons: this.reasons(s, S, access, smallKids, D) })).sort((a, b) => b.score - a.score).slice(0, 3);
    steps.push({ t: `Ranked stays by ${real ? 'accessibility, facilities and distance' : 'reviews, host tenure and ' + (quietWanted ? 'quiet' : 'nightlife')}; shortlisted ${stays.length}` });
    const stay = stays.find(s => s.id === S.stayId) || stays[0];
    const pp = DATA.perPerson, shares = {}; let total = 0;
    for (const h of S.households) {
      const leg = legs.find(l => l.city === h.from), n = h.members.length;
      const extra = S.extra === 'all' || (S.extra === 'optional' && !this.isRemote(S, h)) ? pp.extra : 0;
      const c = leg.opt.price * 2 * n + stay.room * this.nights(S, h) * this.rooms(h) + (pp.cabs + pp.food + extra) * n;
      shares[h.id] = c; total += c;
    }
    const per = total / ppl.length;
    steps.push({ t: per <= S.cap ? `Stayed under ${this.fmt(S.cap)} per person` : `Over the ${this.fmt(S.cap)} cap by ${this.fmt(per - S.cap)} per person`, who: 'Everyone', warn: per > S.cap });
    return { legs, stays, stay, shares, total, per, over: per > S.cap, steps };
  },

  reasons(s, S, access, kids, D) {
    const r = [];
    if (s.real) {
      if (access.length) r.push(s.groundFloor ? `Listed as wheelchair accessible · for ${access.map(a => a.name).join(' and ')}` : `Step-free access isn’t listed · ask the stay before booking`);
      if (kids.length && s.kidsPool) r.push(`Has a swimming pool · check it is shallow for ${kids.map(k => k.name).join(' and ')}`);
      if (s.stars) r.push(`${s.stars}-star listing`);
      r.push(`About ${s.far} min from ${D.centre}`); r.push('Real listing from OpenStreetMap: no reviews or live price in this data'); return r;
    }
    if (access.length) r.push(s.groundFloor ? `Ground-floor rooms, no steps · for ${access.map(a => a.name).join(' and ')}` : `Upper floor with a lift · for ${access.map(a => a.name).join(' and ')}`);
    if (kids.length && s.kidsPool) r.push(`Shallow kids’ pool · for ${kids.map(k => k.name).join(' and ')}`);
    if (S.veg && s.veg) r.push('Pure-veg kitchen');
    r.push(s.quiet ? 'Quiet street' : 'Lively at night');
    r.push(`${s.far} min to ${D.centre}`);
    return r;
  },

  fixes(S, P) {
    const f = [], n = this.people(S).length, D = DEST[S.to];
    const cheaper = P.stays.filter(s => s.room < P.stay.room).sort((a, b) => a.room - b.room)[0];
    if (cheaper) { const save = (P.stay.room - cheaper.room) * S.households.reduce((a, h) => a + this.nights(S, h) * this.rooms(h), 0) / n; f.push({ t: `Stay at ${cheaper.name} instead`, d: `Saves ${this.fmt(save)} per person · ${cheaper.far} min to ${D.centre}${cheaper.kidsPool ? '' : ' · no kids’ pool'}`, apply: () => { S.stayId = cheaper.id; } }); }
    if (S.extra === 'all') f.push({ t: `Drop the ${D.extra}`, d: `Saves ${this.fmt(DATA.perPerson.extra)} per person`, apply: () => { S.extra = 'none'; } });
    const need = Math.ceil(P.per / 500) * 500;
    f.push({ t: `Ask everyone to raise the cap to ${this.fmt(need)}`, d: `All ${S.households.length} household${S.households.length > 1 ? 's' : ''} must say yes`, apply: () => { S.cap = need; } });
    return f;
  }
};
