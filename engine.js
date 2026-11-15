// Rules engine: the part that decides. The AI model only reads and explains.
const Engine = {
  cap(s) { return s.replace(/\b\w/g, c => c.toUpperCase()); },

  // Scripted reader, used when the on-device model is off or fails.
  parse(text) {
    const t = text.toLowerCase();
    const days = Math.min(7, Math.max(2, parseInt((t.match(/(\d+)\s*-?\s*(day|night)/) || [])[1] || 5)));
    const you = { id: 'h1', name: 'Your household', from: DATA.home, members: [{ name: 'You', age: 34 }] };
    if (/(wife|husband|partner|spouse)/.test(t)) you.members.push({ name: 'Partner', age: 35 });
    const kids = [...t.matchAll(/(\d+)\s*-?\s*(?:year|yr)s?\s*-?\s*old/g)].map(m => +m[1]).filter(a => a < 18);
    kids.forEach((a, i) => you.members.push({ name: kids.length > 1 ? 'Child ' + (i + 1) : 'Child', age: a }));
    if (!kids.length && /\b(son|daughter|kid|kids|children|toddler|baby)\b/.test(t)) you.members.push({ name: 'Child', age: 5 });
    const hs = [you];
    if (/(grandparents|grandma|grandpa|grandmother|grandfather)/.test(t)) hs.push({ id: 'h2', name: 'Grandparents', from: DATA.home, members: [{ name: 'Grandma', age: 72 }, { name: 'Grandpa', age: 75 }] });
    else if (/(parents|mom|mum|mother|dad|father|in-laws)/.test(t)) hs.push({ id: 'h2', name: 'Your parents', from: DATA.home, members: [{ name: 'Mom', age: 65 }, { name: 'Dad', age: 68 }] });
    const rel = (t.match(/(brother|sister|cousin|uncle|aunt)/) || [])[1];
    if (rel) { const R = this.cap(rel); hs.push({ id: 'h3', name: R + '’s household', from: DATA.remote, members: [{ name: R, age: 38 }, { name: R + '’s partner', age: 36 }, { name: R + '’s child', age: 8 }] }); }
    const fr = t.match(/(\d+)\s*friends/);
    if (fr) hs.push({ id: 'h4', name: 'Friends', from: DATA.home, members: Array.from({ length: Math.min(8, +fr[1]) }, (_, i) => ({ name: 'Friend ' + (i + 1), age: 30 })) });
    const b = t.match(/(?:₹|rs\.?|inr)\s*([\d,.]+)\s*(k)?/) || t.match(/([\d,.]+)\s*(k)\b/);
    let cap = 15000; if (b) { const v = parseFloat(b[1].replace(/,/g, '')) * (b[2] ? 1000 : 1); if (v >= 5000 && v <= 60000) cap = Math.round(v / 500) * 500; }
    const other = (t.match(/\b(manali|jaipur|kerala|ooty|coorg|udaipur|pondicherry|shimla)\b/) || [])[1];
    return { destination: 'Goa', asked: other ? this.cap(other) : null, days, cap, households: hs };
  },

  people(S) { return S.households.flatMap(h => h.members.map(m => ({ ...m, h: h.id }))); },
  rooms(h) { return Math.ceil(h.members.length / 3); },
  nights(S, h) { return S.remoteShort && h.from !== DATA.home ? Math.max(1, S.days - 3) : S.days - 1; },
  fmt(n) { return '₹' + Math.round(n).toLocaleString('en-IN'); },
  date(S, offset) { const d = new Date(2026, 11, 22 + (S.shift ? 2 : 0) + offset); return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }); },

  plan(S) {
    const steps = [], ppl = this.people(S), legs = [];
    const smallKids = ppl.filter(p => p.age < 10), access = ppl.filter(p => S.access.includes(p.name));
    let seen = 0, cutEarly = 0;
    for (const city of [...new Set(S.households.map(h => h.from))]) {
      const hh = S.households.filter(h => h.from === city), mem = hh.flatMap(h => h.members);
      let opts = DATA.transport[city]; seen += opts.length;
      const kids = mem.filter(m => m.age < 10), needs = mem.filter(m => S.access.includes(m.name));
      const why = [];
      if (kids.length) { const b = opts.length; opts = opts.filter(o => o.depHour >= 8); cutEarly += b - opts.length; why.push('no start before 8 am for ' + kids.map(k => k.name).join(' and ')); }
      if (needs.length) { opts = opts.filter(o => !o.hardForElders && (o.mode !== 'train' || o.lowerBerths)); if (opts.some(o => o.lowerBerths)) why.push('lower berths for ' + needs.map(k => k.name).join(' and ')); }
      const forced = S.forceLeg && S.forceLeg[city];
      const pick = forced ? DATA.transport[city].find(o => o.id === forced) : opts.slice().sort((a, b) => a.price - b.price)[0];
      legs.push({ city, hh, count: mem.length, opt: pick, why: forced ? 'you chose this after the earlier option sold out' : (why.length ? why.join('; ') : 'the cheapest option that fits') });
    }
    steps.push({ t: `Checked ${seen} trains, buses and flights` });
    if (cutEarly) steps.push({ t: `Removed ${cutEarly} starts before 8 am`, who: smallKids.map(k => k.name).join(', ') });
    let stays = DATA.stays.slice();
    if (access.length) { const b = stays.length; stays = stays.filter(s => s.groundFloor || s.lift); steps.push({ t: `Kept ${stays.length} of ${b} stays with step-free rooms`, who: access.map(a => a.name).join(', ') }); }
    const veg = S.veg, quietWanted = S.vibe !== 'Party';
    const score = s => s.rating * 10 + Math.min(s.hostYears, 10) + Math.log10(s.reviews) * 4 + (s.groundFloor ? 4 : 0) + (quietWanted === s.quiet ? 6 : -6) + (smallKids.length && s.kidsPool ? 4 : 0) + (veg && s.veg ? 3 : 0) - s.beachMin / 6 - s.room / 400;
    stays = stays.map(s => ({ ...s, score: score(s), reasons: this.reasons(s, S, access, smallKids) })).sort((a, b) => b.score - a.score).slice(0, 3);
    steps.push({ t: `Ranked stays by reviews, host tenure and ${quietWanted ? 'quiet' : 'nightlife'}; shortlisted ${stays.length}` });
    const stay = stays.find(s => s.id === S.stayId) || stays[0];
    const pp = DATA.perPerson, shares = {}; let total = 0;
    for (const h of S.households) {
      const leg = legs.find(l => l.city === h.from), n = h.members.length;
      const cruise = S.cruise === 'all' || (S.cruise === 'optional' && h.from === DATA.home) ? pp.cruise : 0;
      const c = leg.opt.price * 2 * n + stay.room * this.nights(S, h) * this.rooms(h) + (pp.cabs + pp.food + cruise) * n;
      shares[h.id] = c; total += c;
    }
    const per = total / ppl.length;
    steps.push({ t: per <= S.cap ? `Stayed under ${this.fmt(S.cap)} per person` : `Over the ${this.fmt(S.cap)} cap by ${this.fmt(per - S.cap)} per person`, who: 'Everyone', warn: per > S.cap });
    return { legs, stays, stay, shares, total, per, over: per > S.cap, steps };
  },

  reasons(s, S, access, kids) {
    const r = [];
    if (access.length) r.push(s.groundFloor ? `Ground-floor rooms, no steps · for ${access.map(a => a.name).join(' and ')}` : `Upper floor with a lift · for ${access.map(a => a.name).join(' and ')}`);
    if (kids.length && s.kidsPool) r.push(`Shallow kids’ pool · for ${kids.map(k => k.name).join(' and ')}`);
    if (S.veg && s.veg) r.push('Pure-veg kitchen');
    r.push(s.quiet ? 'Quiet street' : 'Lively at night');
    r.push(`${s.beachMin} min to the beach`);
    return r;
  },

  fixes(S, P) {
    const f = [], n = this.people(S).length;
    const cheaper = P.stays.filter(s => s.room < P.stay.room).sort((a, b) => a.room - b.room)[0];
    if (cheaper) { const save = (P.stay.room - cheaper.room) * S.households.reduce((a, h) => a + this.nights(S, h) * this.rooms(h), 0) / n; f.push({ id: 'stay', t: `Stay at ${cheaper.name} instead`, d: `Saves ${this.fmt(save)} per person · ${cheaper.beachMin} min to the beach${cheaper.kidsPool ? '' : ' · no kids’ pool'}`, apply: () => { S.stayId = cheaper.id; } }); }
    if (S.cruise === 'all') f.push({ id: 'cruise', t: 'Drop the sunset cruise', d: `Saves ${this.fmt(DATA.perPerson.cruise)} per person`, apply: () => { S.cruise = 'none'; } });
    const need = Math.ceil(P.per / 500) * 500;
    f.push({ id: 'cap', t: `Ask everyone to raise the cap to ${this.fmt(need)}`, d: `All ${S.households.length} households must say yes`, apply: () => { S.cap = need; } });
    return f;
  }
};
