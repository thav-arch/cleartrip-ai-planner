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

  people(S) { return S.households.flatMap(h => h.members.map(m => ({ ...m, h: h.id }))); },
  isRemote(S, h) { return h.from !== S.households[0].from; },
  rooms(h) { return Math.ceil(h.members.length / 3); },
  nights(S, h) { return S.remoteShort && this.isRemote(S, h) ? Math.max(1, S.days - 3) : S.days - 1; },
  fmt(n) { return '₹' + Math.round(n).toLocaleString('en-IN'); },
  date(S, offset) { const d = new Date(2026, 11, 22 + (S.shift ? 2 : 0) + offset); return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }); },

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
    let stays = DATA.stays(S.to);
    if (access.length) { const b = stays.length; stays = stays.filter(s => s.groundFloor || s.lift); steps.push({ t: `Kept ${stays.length} of ${b} stays with step-free rooms`, who: access.map(a => a.name).join(', ') }); }
    const quietWanted = S.vibe !== 'Party';
    const score = s => s.rating * 10 + Math.min(s.hostYears, 10) + Math.log10(s.reviews) * 4 + (s.groundFloor ? 4 : 0) + (quietWanted === s.quiet ? 6 : -6) + (smallKids.length && s.kidsPool ? 4 : 0) + (S.veg && s.veg ? 3 : 0) - s.far / 6 - s.room / 400;
    stays = stays.map(s => ({ ...s, score: score(s), reasons: this.reasons(s, S, access, smallKids, D) })).sort((a, b) => b.score - a.score).slice(0, 3);
    steps.push({ t: `Ranked stays by reviews, host tenure and ${quietWanted ? 'quiet' : 'nightlife'}; shortlisted ${stays.length}` });
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
