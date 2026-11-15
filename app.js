const $ = s => document.querySelector(s), app = $('#app');
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const F = n => Engine.fmt(n), wait = ms => new Promise(r => setTimeout(r, ms));
const fresh = () => ({ screen: 'home', text: '', to: 'Goa', guessedTo: false, households: [], days: 5, cap: 15000, access: [], vibe: 'Relaxed', veg: false, nap: true, shift: false, remoteShort: false, dateChoice: 'shift', stayId: null, extra: 'all', forceLeg: {}, moved: false, applied: {}, bk: 0, sold: null, soldDone: false, fix: 0, reader: '', summary: '', busy: false, qa: [], asking: false, looking: false, placeErr: '', toast: '', thread: [], formErr: '' });
let S = fresh(), P = null, run = 0;
const BACK = { chat: 'home', brief: 'chat', dates: 'brief', plan: 'dates', over: 'dates', stays: 'plan', family: 'stays', booking: 'stays', final: 'booking' };
const go = s => { S.screen = s; run++; render(); };
const svg = (d, c = '#fff') => `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const I = { bed: '<path d="M5 21V5h10v16M15 10h4v11M3 21h18M8 9h4M8 13h4"/>', plane: '<path d="M3 13l18-8-6 16-3-7z"/>', train: '<rect x="6" y="3" width="12" height="14" rx="3"/><path d="M6 11h12M9 21l2-4M15 21l-2-4"/>', bus: '<rect x="5" y="4" width="14" height="13" rx="2"/><path d="M5 11h14M8 20v-3M16 20v-3"/>', sun: '<path d="M4 15a8 8 0 0116 0z"/><path d="M12 15v6M9 21h6"/>', home: '<path d="M4 11l8-7 8 7v9h-6v-6h-4v6H4z"/>', trips: '<rect x="4" y="7" width="16" height="13" rx="2"/><path d="M9 7V4h6v3M8 12h8M8 16h5"/>', work: '<rect x="4" y="8" width="16" height="12" rx="2"/><path d="M9 8V5h6v3M4 13h16"/>', user: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="10" r="3"/><path d="M6.5 18a6 6 0 0111 0"/>', offer: '<circle cx="12" cy="12" r="9"/><path d="M9 15l6-6"/>', check: '<path d="M5 12.5l5 5 9-10.500"/>' };
const topBar = t => `<div class="top"><button class="back" data-a="back" aria-label="Back">←</button><h2>${t}</h2></div>`;
const foot = (label, a, v, dis) => `<div class="foot"><button class="cta" data-a="${a}" ${v ? `data-v="${v}"` : ''} ${dis ? 'disabled' : ''}>${label}</button></div>`;
const chips = (key, list, sel) => `<div class="chips">${list.map(l => `<button class="chip ${[].concat(sel).includes(l) ? 'sel' : ''}" data-a="set" data-k="${key}" data-v="${esc(l)}">${esc(l)}</button>`).join('')}</div>`;
const opts = (list, sel) => list.map(c => `<option ${c === sel ? 'selected' : ''}>${c}</option>`).join('');
const remote = () => S.households.find(h => Engine.isRemote(S, h));
const elders = () => Engine.people(S).filter(p => p.age >= 60), tots = () => Engine.people(S).filter(p => p.age < 6);
const count = () => Engine.people(S).length, plural = (n, w) => `${n} ${w}${n > 1 ? 's' : ''}`;
const D = () => DEST[S.to];
const sights = () => { const r = Places.cache[S.to]; const l = r && r.sights.length >= 4 ? r.sights : D().sights; return l.slice(0, 5); };
const wishName = () => sights()[4] || D().wish;
const up = s => s.charAt(0).toUpperCase() + s.slice(1);
const gmap = s => `https://www.google.com/maps/search/?api=1&query=${s.lat},${s.lon}`;
const TRIPS = 'ctp.trips';
const loadTrips = () => { try { return JSON.parse(localStorage.getItem(TRIPS) || '[]'); } catch (e) { return []; } };
const saveTrip = () => { try { const t = loadTrips().filter(x => x.key !== S.key); t.unshift({ key: S.key, to: S.to, label: `${Engine.date(S, 0)} · ${count()} travellers`, per: P.per, st: S, reg: Object.fromEntries([S.to, ...S.households.map(h => h.from)].map(n => [n, CITIES[n] || DEST[n].at])) }); localStorage.setItem(TRIPS, JSON.stringify(t.slice(0, 5))); } catch (e) { /* storage unavailable */ } };
const replan = () => { P = Engine.plan(S); return P; };
const aiChip = () => `<div class="aichip ${AI.ready ? 'on' : ''}"><i></i>${esc(AI.persona.name)} · ${AI.ready ? 'using the ' + AI.label : 'AI is off, using the scripted reader. Choose an AI in the panel.'}</div>`;
const greet = () => AI.persona.greet || `Hi, I’m ${AI.persona.name}. Tell me about the trip: where from, where to, how long, and who’s coming.`;
const facts = () => `Trip: ${S.days} days in ${S.to}, ${Engine.date(S, 0)} to ${Engine.date(S, S.days - 1)}. Travellers: ${S.households.map(h => `${h.name} from ${h.from}: ${h.members.map(m => m.name + ' (' + m.age + ')').join(', ')}`).join('; ')}. Vibe wanted: ${S.vibe}. Step-free access needed by: ${S.access.join(', ') || 'no one'}. Pure-veg kitchen needed: ${S.veg ? 'yes' : 'no'}. Budget cap per person: ${S.cap} rupees. Plan cost: ${Math.round(P.per)} rupees per person, ${Math.round(P.total)} in total. Transport: ${P.legs.map(l => `${l.opt.name} from ${l.city} leaving ${l.opt.dep}, arriving ${l.opt.arr}, ${l.opt.price} rupees each way, chosen because ${l.why}; other options were ${l.all.filter(o => o.id !== l.opt.id).map(o => o.name + ' at ' + o.dep + ' for ' + o.price).join(', ') || 'none'}`).join('. ')}. Shortlisted stays: ${P.stays.map(s => `${s.name} in ${s.area}, ${s.room} rupees a room a night, rated ${s.rating} from ${s.reviews} reviews, host for ${s.hostYears} years, ${s.reasons.join(', ')}`).join(' | ')}. Current stay: ${P.stay.name}. Sights planned: ${sights().join(', ')}; optional paid activity: ${D().extra} at ${DATA.perPerson.extra} rupees per person. All data is simulated.`;

const V = {
  home: () => `<div class="wrap"><div class="body">
    <div class="row c sb"><div class="logo"><i>${svg(I.check)}</i>cleartrip</div><span class="pill">Concept</span></div>
    <div class="grid"><div class="tile lg"><div class="ic" style="background:#8E6CEF">${svg(I.bed)}</div><b>Hotels</b><span>30–80% off</span></div><div class="tile lg"><div class="ic" style="background:#3B7BFF">${svg(I.plane)}</div><b>Flights</b><span>Up to 25% off</span></div></div>
    <div class="grid"><div class="tile"><div class="ic" style="background:#F26B5E">${svg(I.train)}</div><b>Trains</b><span>Flat 10% off</span></div><div class="tile"><div class="ic" style="background:#3DAA6D">${svg(I.bus)}</div><b>Buses</b><span>Flat 15% off</span></div><div class="tile"><div class="ic" style="background:#4DB6E8">${svg(I.sun)}</div><b>Holidays</b><span>Up to 25% off</span></div></div>
    <div class="hero"><span class="o">✦ NEW · AI TRIP PLANNER</span><h3>Plan one trip that works for everyone</h3><p class="muted">Tell it who’s going. It plans around each person and helps every household agree.</p><button class="cta" data-a="start">Plan with AI</button></div>
    ${(() => { const t = loadTrips(); return t.length ? `<p class="sec">Your trip plans</p>` + t.slice(0, 3).map((x, i) => `<button class="saved" data-a="open" data-v="${i}"><div class="t">${esc(x.to)}</div><div class="d">${esc(x.label)} · ${F(x.per)} per person</div></button>`).join('') : `<div class="card dash"><p class="h">No trip plans yet</p><p class="muted">Trips you start with AI are saved on this device.</p></div>`; })()}
  </div></div><div class="nav">${[['home', 'Home', 1], ['trips', 'My Trips'], ['work', 'Work'], ['user', 'Account'], ['offer', 'Offers']].map(([i, l, a]) => `<span class="${a ? 'a' : ''}">${svg(I[i], a ? '#fff' : '#9A9AA0')}${l}</span>`).join('')}</div>`,

  chat: () => {
    const p = AI.persona, say = h => `<div class="msg"><div class="av">${esc(p.name.charAt(0).toUpperCase())}</div><div class="bub">${h}</div></div>`;
    const ex = ['Goa for 5 days from Bengaluru with my parents, my 4-year-old and my brother’s family from Delhi', '4 days in Jaipur from Mumbai with my wife and 6 friends, under ₹12,000 each', 'A week in Kerala from Chennai with my grandparents and my 3-year-old'];
    let b = say(esc(greet()));
    if (!S.thread.length) b += `<p class="sec">Try one of these</p><div class="chips">${ex.map(e => `<button class="chip" data-a="example" data-v="${esc(e)}">${esc(e)}</button>`).join('')}</div>`;
    else {
      for (const m of S.thread) b += m.who === 'me' ? `<div class="msg me"><div class="bub">${esc(m.t)}</div></div>` : say(esc(m.t));
      if (S.busy) b += say(`<div class="row c"><span class="dot spin"></span>Reading your message…</div>`);
      else b += say(`<span>${esc(p.ack || 'Got it.')} <b>${S.days} days in ${S.to}</b>${S.guessedTo ? ' (you didn’t name a place, so I’ve assumed Goa; change it on the next screen)' : ''}. Here’s who is going:</span>${S.households.map(h => `<div><div class="d">${esc(h.name)} · from ${h.from}</div><div class="chips" style="margin-top:6px">${h.members.map(m => `<span class="chip plain">${esc(m.name)} · ${m.age}<button class="x" data-a="rm" data-v="${h.id}" data-k="${esc(m.name)}" aria-label="Remove ${esc(m.name)}">×</button></span>`).join('')}</div></div>`).join('')}<b>${plural(count(), 'traveller')} · ${plural(S.households.length, 'household')}</b>
        <div class="addp"><p class="d">Add someone, or type a change below (like “add my sister Riya, 30”).</p><div class="row"><input id="pn" placeholder="Name" maxlength="24"><input id="pa" type="number" inputmode="numeric" min="0" max="95" placeholder="Age" style="max-width:72px"></div><select id="ph">${S.households.map(h => `<option value="${h.id}">${esc(h.name)}</option>`).join('')}<option value="new">A new household</option></select><label class="chk"><input type="checkbox" id="pacc"> Needs step-free access</label>${S.formErr ? `<p class="err">${esc(S.formErr)}</p>` : ''}<button class="sm k" data-a="addp">Add person</button></div>`) + `<p class="d center">${S.reader}</p>`;
    }
    return topBar('AI trip planner') + `<div class="body">${aiChip()}${b}</div><div class="foot"><div class="field"><textarea id="msg" placeholder="${S.thread.length ? 'Add or change anything…' : 'Type your trip…'}"></textarea><button class="send" data-a="send" aria-label="Send">↑</button></div>${S.thread.length && !S.busy ? `<button class="cta" data-a="go" data-v="brief">Looks right, continue</button>` : ''}</div>`;
  },

  brief: () => topBar('Trip brief') + `<div class="body"><p class="muted">Everyone sees this brief, so expectations match before I plan.</p>
    <div class="card"><p class="h">Route</p><datalist id="places">${Places.names().map(n => `<option value="${esc(n)}">`).join('')}</datalist><div class="sel-row"><label>Going to<input data-sel="to" list="places" value="${esc(S.to)}"></label><label>Days<select data-sel="days">${opts([2, 3, 4, 5, 6, 7], S.days)}</select></label></div>
      ${S.placeErr ? `<p class="err">${esc(S.placeErr)}</p>` : '<p class="d">Type any Indian city or town, or pick from the list.</p>'}${S.households.map(h => `<div class="sel-row"><label>${esc(h.name)} (${h.members.length}) travels from<input data-sel="from" data-h="${h.id}" list="places" value="${esc(h.from)}"></label></div>`).join('')}</div>
    <div class="card"><p class="h">What’s the vibe?</p><p class="d">“${S.to}” means different things to different people.</p>${chips('vibe', ['Relaxed', 'Sightseeing', 'Party', 'A mix'], S.vibe)}</div>
    ${elders().length ? `<div class="card"><p class="h">Does anyone need step-free access?</p>${chips('access', elders().map(e => e.name), S.access)}</div>` : ''}
    ${tots().length ? `<div class="card"><p class="h">Does ${esc(tots().map(t => t.name).join(' or '))} nap in the afternoon?</p><p class="d">I’ll keep 1–3 pm free and avoid packed days.</p>${chips('nap', ['Yes', 'No'], S.nap ? 'Yes' : 'No')}</div>` : ''}
    <div class="card"><p class="h">Does anyone need a pure-veg kitchen?</p>${chips('veg', ['Yes', 'No'], S.veg ? 'Yes' : 'No')}</div>
    <div class="card"><p class="h">Budget cap per person</p><p class="d">Set to the lowest ceiling in the group. I won’t go above it.</p><div class="row c sb"><span class="big" id="capv">${F(S.cap)}</span><span class="pill">All travel + stay</span></div><input type="range" id="cap" min="6000" max="40000" step="500" value="${S.cap}"></div>
  </div>` + foot('Save brief', 'go', 'dates'),

  dates: () => {
    const r = remote(), a = { ...S, shift: false }, b = { ...S, shift: true }, want = `${Engine.date(a, 0)} – ${Engine.date(a, S.days - 1)}`, free = `${Engine.date(b, 0)} – ${Engine.date(b, S.days - 1)}`;
    return topBar('Dates') + `<div class="body"><p class="muted">Each household adds its own dates from a link. No login needed. (Their answers are simulated here.)</p>
    <div class="card" style="gap:0;padding:0">${S.households.map((h, i) => `<div class="row c" style="padding:12px 14px;${i ? 'border-top:1px solid var(--line)' : ''}"><div class="grow"><div class="t">${esc(h.name)}</div><div class="d">${h === r ? free + ' only' : i ? 'Any dates' : want}</div></div><span class="pill g">Added</span></div>`).join('')}</div>
    ${r ? `<div class="card warn"><p class="h">⚠ Dates don’t line up</p><p class="muted" style="color:var(--ink)">${esc(r.name)} is free ${free} only. You asked for ${want}.</p>
      <button class="opt ${S.dateChoice === 'shift' ? 'sel' : ''}" data-a="date" data-v="shift"><span class="radio"></span><span><b>Shift to ${free}</b><div class="d">Everyone can come for all ${S.days} days.</div><span class="pill g">Recommended</span></span></button>
      <button class="opt ${S.dateChoice === 'keep' ? 'sel' : ''}" data-a="date" data-v="keep"><span class="radio"></span><span><b>Keep ${want}</b><div class="d">${esc(r.name)} joins for ${Math.max(2, S.days - 2)} days.</div></span></button></div>` : `<div class="card soft"><p class="muted">Everyone is free on the same dates.</p></div>`}
  </div>` + foot(r && S.dateChoice === 'shift' ? 'Shift the dates' : 'Confirm dates', 'saveDates');
  },

  planning: () => S.looking ? topBar('Planning') + `<div class="body"><p class="big" style="font-size:20px;margin:0">Looking up real stays near ${esc(S.to)}…</p><p class="muted">Searching OpenStreetMap for hotels, guest houses and sights. This takes a few seconds.</p><div class="card"><div class="row c"><span class="dot spin"></span><span class="muted">Searching…</span></div></div></div>` : topBar('Planning') + `<div class="body"><p class="big" style="font-size:20px;margin:0">Planning around ${plural(count(), 'traveller')}</p><p class="muted">You can see every step I take.</p>
    <div class="card" style="gap:12px">${P.steps.map(s => `<div class="row step"><span class="dot ${s.warn ? 'bad' : 'ok'}">${s.warn ? '!' : '✓'}</span><div class="grow"><div style="font-size:14px">${esc(s.t)}</div>${s.who ? `<span class="pill" style="margin-top:4px">For ${esc(s.who)}</span>` : ''}</div></div>`).join('')}<div class="row step"><span class="dot spin"></span><div class="grow muted">${AI.ready ? 'Writing up the plan…' : 'Putting the plan together…'}</div></div></div></div>`,

  over: () => topBar('Your trip plan') + `<div class="body"><div class="card warn"><p class="h">⚠ This plan is ${F(P.per - S.cap)} over your cap</p><p class="muted" style="color:var(--ink)">That’s per person. I won’t go above ${F(S.cap)} unless every household agrees. Here are ways to fix it:</p>
    ${Engine.fixes(S, P).map((f, i) => `<button class="opt ${S.fix === i ? 'sel' : ''}" data-a="fix" data-v="${i}"><span class="radio"></span><span><b>${esc(f.t)}</b><div class="d">${esc(f.d)}</div></span></button>`).join('')}</div></div>` + foot('Apply and re-plan', 'applyFix'),

  plan: () => {
    const s = sights(), heavyOn = S.nap && tots().length && !S.moved;
    const days = [{ t: `Arrive, lunch, settle in near ${D().centre}`, lv: 1 }, { t: S.moved ? `${s[1]} and ${s[2]}` : `${s[0]}, ${s[1]} and ${s[2]}`, lv: S.moved ? 2 : 4, heavy: heavyOn }, { t: `Easy morning${S.moved ? ', ' + s[0] : ''}${S.applied.wish === 'yes' ? ', ' + wishName() : ''}, free afternoon`, lv: 2 }, { t: `${s[3]}${S.extra === 'none' ? ', free evening' : ', then the ' + D().extra + (S.extra === 'optional' ? ' (optional)' : '')}`, lv: 3 }, { t: 'Free day', lv: 1 }, { t: 'Free day', lv: 1 }].slice(0, S.days - 1).concat({ t: 'Slow breakfast, pack, head home', lv: 1 });
    return topBar('Your trip plan') + `<div class="body">
    <div class="card"><div><div class="lab">Where to?</div><div class="val">${S.to}</div></div><hr><div class="row c sb"><div><div class="lab">Start</div><div class="val">${Engine.date(S, 0)}</div></div><span class="pill">${plural(S.days - 1, 'NIGHT')}</span><div style="text-align:right"><div class="lab">End</div><div class="val">${Engine.date(S, S.days - 1)}</div></div></div><hr><div><div class="lab">Travellers</div><div class="val">${plural(count(), 'traveller')}, ${plural(S.households.length, 'household')}</div></div><hr>
      <div class="row sb" style="align-items:flex-end"><div><div class="big">${F(P.total)}</div><div class="d">${F(P.per)} per person</div></div><span class="pill g">Under your ${F(S.cap)} cap</span></div>
      ${S.households.length > 1 ? `<div class="split">${S.households.map(h => `<div><span class="d">${esc(h.id === 'h1' ? 'You' : h.name.replace(/^Your /, '').replace(/’s household/, ''))}</span><b>${F(P.shares[h.id])}</b></div>`).join('')}</div>` : ''}</div>
    ${S.summary ? `<div class="card note"><p class="d" style="color:var(--blue);font-weight:600">In short · written by the ${AI.label}</p><p class="muted" style="color:var(--ink)">${esc(S.summary)}</p></div>` : ''}
    <p class="sec">Getting there</p>
    ${P.legs.map(l => `<div class="card"><div class="row"><div class="ic" style="background:var(--bg);border-radius:8px">${svg(I[l.opt.mode === 'flight' ? 'plane' : l.opt.mode], '#1A1A1A')}</div><div class="grow"><div class="t">${l.opt.name} · ${l.city} → ${S.to}</div><div class="d">${l.opt.note ? 'Leaves the ' + l.opt.note + ', ' : ''}${l.opt.dep} → ${l.opt.arr} · ${plural(l.count, 'traveller')} · ${F(l.opt.price)} each way</div></div></div><div class="why">Why: ${esc(l.why)}.</div></div>`).join('')}
    <p class="sec">Stay</p><div class="card dash"><p class="h">${P.stays.length} stays shortlisted</p><p class="muted">I never pick your stay for you. The total above assumes ${esc(P.stay.name)} for now.</p></div>
    <p class="sec">Day by day</p>
    ${days.map((d, i) => `<div class="card ${d.heavy ? 'warn' : ''}"><div class="row c sb"><div class="grow"><div class="t">Day ${i + 1} · ${Engine.date(S, i).split(' ')[0]}</div><div class="d">${esc(d.t)}</div></div><div class="bars ${d.heavy ? 'hv' : ''}">${[0, 1, 2, 3].map(k => `<i class="${k < d.lv ? 'f' : ''}"></i>`).join('')}</div></div>${d.heavy ? `<p class="muted" style="color:var(--ink)">Packed. Too much walking for ${esc(tots().map(t => t.name).join(' and '))}, and no nap window.</p><div class="row"><button class="sm k" data-a="move">Move ${esc(s[0])} to Day 3</button><button class="sm" data-a="keepDay">Keep it</button></div>` : ''}</div>`).join('')}
    <p class="sec">Ask about this plan</p>
    <div class="card">${S.qa.map(q => `<div><div class="t" style="font-size:14px">${esc(q.q)}</div><p class="muted" style="color:var(--ink);margin-top:4px">${q.a === null ? '<span class="dot spin" style="display:inline-block;vertical-align:middle"></span> Thinking…' : esc(q.a)}</p></div><hr>`).join('')}
      ${AI.ready ? `<div class="chips">${['Why this train or flight?', 'Which stay is quietest?', 'What can we cut to save money?'].map(q => `<button class="chip" data-a="askq" data-v="${q}">${q}</button>`).join('')}</div><div class="ask"><input id="ask" placeholder="Ask anything about the plan…"><button class="sm k" data-a="ask">Ask</button></div>` : `<p class="muted">Turn on an AI mode in the side panel to ask questions about the plan.</p>`}</div>
  </div>` + foot('Choose your stay', 'go', 'stays');
  },

  stays: () => topBar('Choose your stay') + `<div class="body"><p class="muted">${P.stays.length} stays in ${S.to} that fit your brief. I checked each one. You pick.</p>
    ${P.stays.map((s, i) => `<div class="card" ${i === 0 ? 'style="border-color:var(--orange)"' : ''}>${i === 0 ? `<div class="photo"><span class="pill" style="background:#fff;color:var(--ink)">${s.real ? 'Real listing · OpenStreetMap' : 'Photo slot · guest photos and reels'}</span></div>` : ''}
      <div class="row sb"><div><div class="h" style="font-size:16px">${s.name}</div><div class="d">${s.area}${i && s.room !== P.stays[0].room ? ` · ${s.room < P.stays[0].room ? F(P.stays[0].room - s.room) + ' less' : F(s.room - P.stays[0].room) + ' more'} a room a night` : ''}</div></div><div style="text-align:right"><b>${s.est ? '~' : ''}${F(s.room)}</b><div class="d">${s.est ? 'estimated, per room' : 'room / night'}</div></div></div>
      ${s.reasons.map(r => `<div class="tick ${/isn’t listed/.test(r) ? 'w' : /^Real listing/.test(r) ? 'i' : ''}">${esc(r)}</div>`).join('')}
      ${s.real ? `<div class="row links"><a class="lnk" href="${gmap(s)}" target="_blank" rel="noopener">Open in Maps</a>${s.website ? `<a class="lnk" href="${esc(s.website)}" target="_blank" rel="noopener">Website</a>` : ''}</div>` : `<div class="chips"><span class="chip plain">★ ${s.rating} · ${s.reviews} reviews</span><span class="chip plain">Host for ${s.hostYears} years</span></div>`}
      ${s.real ? '' : `<div class="quote">“${s.quote}”<div class="d">Sample review</div></div>`}
      <button class="${i === 0 ? 'cta' : 'sm'}" data-a="pick" data-v="${s.id}">Pick ${i === 0 ? 'this stay' : s.name}</button></div>`).join('')}</div>`,

  family: () => { const r = remote(), kid = Engine.people(S).find(p => p.age >= 6 && p.age < 18); return topBar('Family review') + `<div class="body"><div class="card soft"><p class="h">Shared with ${plural(S.households.length, 'household')}</p><p class="muted">Family members suggest. You make the final call. (Their replies are simulated.)</p></div>
    ${r && S.extra !== 'none' ? `<div class="card"><p class="d">${esc(r.members[0].name)} · ${esc(r.name)}</p><p class="h">“Can we skip the ${D().extra}? It’s over our budget.”</p><div class="why">Suggestion: make it optional. Only those who join pay. ${esc(r.name)} saves ${F(DATA.perPerson.extra * r.members.length)}.</div>${S.applied.extra ? `<span class="pill g">${S.applied.extra === 'yes' ? 'Made optional' : 'Kept as is'}</span>` : `<div class="row"><button class="sm k" data-a="sug" data-k="extra" data-v="yes">Make it optional</button><button class="sm" data-a="sug" data-k="extra" data-v="no">Keep as is</button></div>`}</div>` : ''}
    <div class="card"><p class="d">${esc((kid || S.households[S.households.length - 1].members[0]).name)} · added to the wishlist</p><p class="h">${esc(up(wishName()))}, from a reel they shared</p><div class="why">It fits Day 3. Adds about 40 minutes and no cost.</div>${S.applied.wish ? `<span class="pill g">${S.applied.wish === 'yes' ? 'Added to Day 3' : 'Left out'}</span>` : `<div class="row"><button class="sm k" data-a="sug" data-k="wish" data-v="yes">Add to Day 3</button><button class="sm" data-a="sug" data-k="wish" data-v="no">Not this trip</button></div>`}</div>
    <div class="card soft"><div class="row sb c"><span class="muted">Total now</span><b>${F(P.total)} · ${F(P.per)} each</b></div></div></div>` + foot('Finalise plan', 'go', 'booking'); },

  booking: () => {
    const items = bookItems();
    return topBar('Booking') + `<div class="body"><p class="muted">I book in order and stop the moment anything changes. (Nothing is really booked.)</p>
    <div class="card" style="gap:0;padding:0">${items.map((it, i) => { const st = S.sold && S.sold.i === i ? 'bad' : S.sold && it.hold ? 'hold' : i < S.bk ? (it.hold ? 'hold' : 'ok') : i === S.bk && !S.sold ? 'spin' : ''; return `<div class="row" style="padding:12px 14px;${i ? 'border-top:1px solid var(--line)' : ''}"><span class="dot ${st}">${st === 'ok' ? '✓' : st === 'bad' ? '!' : st === 'hold' ? '◷' : ''}</span><div class="grow"><div class="t">${it.t}</div><div class="d" ${st === 'bad' ? 'style="color:var(--amber)"' : ''}>${st === 'bad' ? 'Sold out while booking' : st === 'ok' ? it.done : st === 'hold' ? 'On hold for 20 minutes' : st === 'spin' ? 'Booking…' : 'Waiting'}</div></div></div>`; }).join('')}</div>
    ${S.sold ? `<div class="card warn"><p class="h">⚠ The ${S.sold.opt.dep} ${S.sold.opt.mode} just sold out</p><p class="muted" style="color:var(--ink)">I’ve held your stay so you don’t lose it. Pick another way from ${S.sold.city}:</p>${S.sold.alts.map((o, i) => `<button class="opt ${S.sold.pick === i ? 'sel' : ''}" data-a="alt" data-v="${i}"><span class="radio"></span><span><b>${o.name}, ${o.dep}</b><div class="d">${o.price >= S.sold.opt.price ? '+' : '−'}${F(Math.abs(o.price - S.sold.opt.price))} per person each way · arrives ${o.arr}${o.depHour < 8 ? ' · an early start' : ''}</div>${i === 0 ? '<span class="pill g">Recommended</span>' : ''}</span></button>`).join('')}</div>` : ''}</div>` + (S.sold ? foot(`Book the ${S.sold.alts[S.sold.pick].dep} ${S.sold.alts[S.sold.pick].mode}`, 'bookAlt') : foot('Review and pay', 'go', 'final', S.bk < items.length));
  },

  final: () => topBar('Review') + `<div class="body"><p class="muted">Everything is booked or on hold. You make the final call.</p>
    <div class="card" style="gap:0;padding:0">${bookItems().map((it, i) => `<div class="row" style="padding:12px 14px;${i ? 'border-top:1px solid var(--line)' : ''}"><span class="dot ${it.hold ? 'hold' : 'ok'}">${it.hold ? '◷' : '✓'}</span><div class="grow"><div class="t">${it.t}</div><div class="d">${it.hold ? 'On hold · confirm the cancellation terms with the stay' : it.done}</div></div></div>`).join('')}</div>
    <div class="card"><div class="row sb c"><span class="muted">Total for ${count()}</span><span class="big" style="font-size:18px">${F(P.total)}</span></div><div class="row sb c"><span class="muted">Per person</span><span><b>${F(P.per)}</b> <span class="pill ${P.over ? 'a' : 'g'}">${P.over ? 'Over cap' : 'Under cap'}</span></span></div>${S.households.map(h => `<hr><div class="row sb c"><span style="font-size:13px">${esc(h.name)} (${h.members.length})</span><b style="font-size:13px">${F(P.shares[h.id])}</b></div>`).join('')}</div>
    <div class="card note"><p class="h" style="color:var(--blue)">What I leave to you</p><p class="muted" style="color:var(--ink)">Paying, confirming the final booking, and messaging the host. I draft, you decide.</p></div></div>` + foot(`Pay your share · ${F(P.shares[S.households[0].id])}`, 'go', 'done'),

  done: () => `<div class="body"><div class="ok-badge">✓</div><p class="big center" style="margin:0">You’re going to ${S.to}</p><p class="muted center">${Engine.date(S, 0)} – ${Engine.date(S, S.days - 1)} · ${plural(count(), 'traveller')} · ${plural(S.households.length, 'household')}</p>
    <div class="card"><p class="sec" style="margin:0">I’ll remind you</p>${P.legs.map(l => `<div class="row"><span class="dot hold">◷</span><div class="grow"><div class="t">${l.opt.name} from ${l.city}</div><div class="d">Leaves ${l.opt.note ? 'the ' + l.opt.note + ' at ' : 'at '}${l.opt.dep}.</div></div></div>`).join('')}${S.moved ? `<div class="row"><span class="dot hold">◷</span><div class="grow"><div class="t">${esc(up(sights()[0]))} moved</div><div class="d">Day 3 morning, before the nap.</div></div></div>` : ''}</div>
    <div class="card"><p class="h">Make it real</p><p class="muted">Nothing was booked here. Use this plan to book each part, then confirm the stay with its owner.</p><button class="cta" data-a="wa">Share on WhatsApp</button><button class="ghost" data-a="copy">${S.toast || 'Copy the itinerary'}</button><div class="row links"><a class="lnk" href="https://www.cleartrip.com/" target="_blank" rel="noopener">Search on Cleartrip</a><a class="lnk" href="${gmap(P.stay)}" target="_blank" rel="noopener">Open the stay in Maps</a></div><p class="warnnote">Fares, times and availability above are estimates. Check them before you pay.</p></div></div>` + foot('Plan another trip', 'reset')
};

function itinerary() {
  const L = [`Trip to ${S.to} · ${Engine.date(S, 0)} to ${Engine.date(S, S.days - 1)}`, `${plural(count(), 'traveller')} in ${plural(S.households.length, 'household')} · about ${F(P.per)} each (estimate)`, ''];
  for (const l of P.legs) L.push(`${l.opt.name}, ${l.city} to ${S.to}: leaves ${l.opt.dep}, arrives ${l.opt.arr} (${plural(l.count, 'traveller')}, about ${F(l.opt.price)} each way)`);
  L.push('', `Stay: ${P.stay.name}${P.stay.real ? ' (' + gmap(P.stay) + ')' : ''}`, '', 'Sights: ' + sights().slice(0, 4).join(', '), '', 'Fares, times and availability are estimates. Confirm before booking.');
  return L.join('\n');
}
function bookItems() {
  const a = P.legs.map(l => ({ t: `${l.opt.name} · ${l.city} → ${S.to}, ${l.opt.dep}`, done: `${plural(l.count, 'seat')} confirmed`, leg: l }));
  a.push({ t: `Stay · ${P.stay.name}`, hold: true, done: '' }, { t: `Cabs · ${plural(P.legs.length, 'pickup')}`, done: 'Timed to each arrival' });
  return a;
}
async function animatePlanning() {
  const me = run; for (const s of [...app.querySelectorAll('.step')]) { await wait(550); if (me !== run) return; s.classList.add('in'); }
  await wait(700); if (me !== run) return;
  S.summary = ''; if (AI.ready && !P.over) { try { S.summary = await AI.summarise(facts()); } catch (e) { aiFailed(e); } if (me !== run) return; }
  go(P.over ? 'over' : 'plan');
}
async function animateBooking() {
  const me = run, items = bookItems();
  while (S.bk < items.length && !S.sold) {
    await wait(900); if (me !== run) return;
    const it = items[S.bk]; if (!it) return;
    const alts = it.leg ? it.leg.all.filter(o => o.id !== it.leg.opt.id).sort((a, b) => (b.depHour >= 8) - (a.depHour >= 8) || a.price - b.price).slice(0, 3) : [];
    if (it.leg && it.leg.opt.sellsOut && !S.soldDone && alts.length) S.sold = { i: S.bk, city: it.leg.city, opt: it.leg.opt, alts, pick: 0 }; else S.bk++;
    render(false, false);
  }
}
function aiFailed(e) { AI.lastError = e.message || 'no reply'; $('#aiNote').textContent = 'The AI didn’t answer just now (' + AI.lastError + '). The scripted reader filled in, and the AI will be tried again on your next message.'; }
async function read(text) {
  S.text = text; S.thread = [{ who: 'me', t: text }]; S.formErr = ''; S.busy = true; S.summary = ''; S.qa = []; render();
  const base = Engine.parse(text); let got = null;
  if (AI.ready) { try { got = await AI.readBrief(text, base); $('#aiNote').textContent = ''; } catch (e) { got = null; aiFailed(e); } } else await wait(600);
  Object.assign(S, { households: base.households, days: base.days, cap: base.cap, to: base.to, guessedTo: base.guessedTo }, got || {});
  if (got) { try { if (got.toRaw) { const n = await Places.resolve(got.toRaw); if (n) { S.to = n; S.guessedTo = false; } } for (const h of S.households) if (h.fromRaw) { const n = await Places.resolve(h.fromRaw); h.from = n || base.home; } } catch (e) { /* keep scripted values */ } }
  S.key = Date.now();
  S.reader = got ? 'Read by the ' + AI.label : AI.ready ? 'The AI didn’t give a usable answer, so the scripted reader was used' : 'Read by the scripted reader · AI is off';
  S.access = elders().slice(0, 1).map(e => e.name); S.veg = elders().length > 0; S.busy = false; S.stayId = null; S.forceLeg = {}; S.soldDone = false; S.applied = {}; S.extra = 'all'; S.moved = false;
  render();
}
const names = () => new Set(Engine.people(S).map(p => p.name));
async function refine(t) {
  const before = names(), beforeDays = S.days, beforeCap = S.cap; S.thread.push({ who: 'me', t }); S.busy = true; S.summary = ''; S.formErr = ''; render();
  let ok = false, msg = '';
  if (AI.ready) {
    try {
      const cur = { destination: S.to, home_city: S.households[0].from, days: S.days, budget_per_person: S.cap, households: S.households.map(h => ({ name: h.name, city: h.from, members: h.members })) };
      const got = await AI.readBrief(t, null, cur);
      S.households = got.households; if (got.days) S.days = got.days; if (got.cap) S.cap = got.cap;
      if (got.toRaw) { const n = await Places.resolve(got.toRaw); if (n) { S.to = n; S.guessedTo = false; } }
      for (const h of S.households) if (h.fromRaw) { const n = await Places.resolve(h.fromRaw); h.from = n || S.households[0].from; }
      ok = true;
    } catch (e) { aiFailed(e); }
  }
  if (!ok) { const r = Engine.edit(S, t); ok = !r.msg; msg = r.msg || ''; }
  const after = names(), add = [...after].filter(n => !before.has(n)), gone = [...before].filter(n => !after.has(n));
  S.access = S.access.filter(n => after.has(n)).concat(Engine.people(S).filter(p => add.includes(p.name) && p.age >= 65).map(p => p.name));
  if (ok) { const bits = []; if (add.length) bits.push('Added ' + add.join(', ')); if (gone.length) bits.push('Removed ' + gone.join(', ')); if (S.days !== beforeDays) bits.push(`Now ${S.days} days`); if (S.cap !== beforeCap) bits.push(`Budget ${F(S.cap)} each`); msg = (AI.persona.ack || 'Got it.') + ' ' + (bits.length ? bits.join('. ') + '.' : 'No change was needed.'); }
  S.thread.push({ who: 'ai', t: msg }); S.busy = false; S.stayId = null; S.forceLeg = {}; S.key = Date.now(); render();
}
async function ask(q) {
  if (!q || S.asking) return; S.asking = true; const item = { q, a: null }; S.qa.push(item); render(false, false);
  try { item.a = await AI.ask(q, facts()) || 'I didn’t get an answer. Try again.'; } catch (e) { aiFailed(e); item.a = 'The AI didn’t answer just now. Try again in a moment.'; }
  S.asking = false; if (S.screen === 'plan') render(false, false);
}
function render(scroll = true, anim = true) {
  const keep = app.querySelector('.body')?.scrollTop || 0;
  app.innerHTML = V[S.screen]();
  const b = app.querySelector('.body'); if (b) b.scrollTop = scroll ? (S.screen === 'chat' ? b.scrollHeight : 0) : keep;
  if (anim && S.screen === 'planning') animatePlanning();
  if (anim && S.screen === 'booking' && !S.sold) animateBooking();
  const cap = $('#cap'); if (cap) cap.oninput = () => { S.cap = +cap.value; $('#capv').textContent = F(S.cap); };
  const msg = $('#msg'); if (msg) msg.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); act('send'); } };
  const aq = $('#ask'); if (aq) aq.onkeydown = e => { if (e.key === 'Enter') act('ask'); };
}
function act(a, v, k) {
  if (a === 'back') return go(BACK[S.screen] || 'home');
  if (a === 'start') return go('chat');
  if (a === 'go') { if (['stays', 'booking', 'final', 'done'].includes(v)) replan(); if (v === 'done') saveTrip(); if (v === 'booking') { S.bk = 0; S.sold = null; } return go(v); }
  if (a === 'example') return read(v);
  if (a === 'send') { const t = $('#msg').value.trim(); if (!t) return; return S.households.length ? refine(t) : read(t); }
  if (a === 'rm') { const h = S.households.find(x => x.id === v); if (!h) return; if (count() <= 1) { S.formErr = 'At least one traveller has to stay.'; return render(false, false); } h.members = h.members.filter(m => m.name !== k); S.access = S.access.filter(n => n !== k); if (!h.members.length) S.households = S.households.filter(x => x !== h); S.stayId = null; return render(false, false); }
  if (a === 'addp') {
    let n = $('#pn').value.trim().slice(0, 24); const age = parseInt($('#pa').value);
    if (!n || isNaN(age) || age < 0 || age > 95) { S.formErr = 'Enter a name and an age from 0 to 95.'; return render(false, false); }
    if (count() >= 24) { S.formErr = 'That’s the most people I can plan for in one trip.'; return render(false, false); }
    const used = names(); let u = n, i = 2; while (used.has(u)) u = n + ' ' + i++; n = u;
    const hid = $('#ph').value; if (hid === 'new') S.households.push({ id: 'h' + (Math.max(...S.households.map(h => +h.id.slice(1))) + 1), name: n + '’s household', from: S.households[0].from, members: [{ name: n, age }] }); else S.households.find(h => h.id === hid).members.push({ name: n, age });
    if ($('#pacc').checked) S.access.push(n); S.formErr = ''; S.stayId = null; S.thread.push({ who: 'ai', t: `${AI.persona.ack || 'Got it.'} Added ${n} (${age}).` }); S.key = Date.now(); return render();
  }
  if (a === 'set') { if (k === 'access') S.access = S.access.includes(v) ? S.access.filter(x => x !== v) : [...S.access, v]; else if (k === 'nap' || k === 'veg') S[k] = v === 'Yes'; else S[k] = v; return render(false); }
  if (a === 'date') { S.dateChoice = v; return render(false); }
  if (a === 'saveDates') { const r = remote(); S.shift = !!r && S.dateChoice === 'shift'; S.remoteShort = !!r && S.dateChoice === 'keep'; S.stayId = null; S.forceLeg = {}; S.soldDone = false; S.looking = true; go('planning'); const me = S.key; Places.load(S.to).catch(() => null).then(() => { if (S.key !== me) return; S.looking = false; replan(); if (S.screen === 'planning') render(); }); return; }
  if (a === 'fix') { S.fix = +v; return render(false); }
  if (a === 'applyFix') { Engine.fixes(S, P)[S.fix].apply(); S.fix = 0; replan(); return go('planning'); }
  if (a === 'move') { S.moved = true; return render(false, false); }
  if (a === 'keepDay') { S.nap = false; return render(false, false); }
  if (a === 'ask') return ask(($('#ask')?.value || '').trim());
  if (a === 'askq') return ask(v);
  if (a === 'pick') { S.stayId = v; replan(); return go(P.over ? 'over' : S.households.length > 1 ? 'family' : 'booking'); }
  if (a === 'sug') { S.applied[k] = v; if (k === 'extra' && v === 'yes') S.extra = 'optional'; replan(); return render(false); }
  if (a === 'alt') { S.sold.pick = +v; return render(false, false); }
  if (a === 'bookAlt') { S.forceLeg[S.sold.city] = S.sold.alts[S.sold.pick].id; S.soldDone = true; S.sold = null; replan(); S.bk++; run++; return render(false); }
  if (a === 'open') { const x = loadTrips()[+v]; if (!x) return; for (const [n, c] of Object.entries(x.reg)) Places.register(n, c[0], c[1]); S = { ...fresh(), ...x.st, screen: 'plan', looking: false, bk: 0, sold: null }; replan(); go('plan'); Places.load(S.to).then(() => { if (S.screen === 'plan') { replan(); render(false, false); } }); return; }
  if (a === 'wa') return void window.open('https://wa.me/?text=' + encodeURIComponent(itinerary()), '_blank');
  if (a === 'copy') { const done = () => { S.toast = 'Copied'; render(false, false); setTimeout(() => { S.toast = ''; if (S.screen === 'done') render(false, false); }, 1800); }; (navigator.clipboard ? navigator.clipboard.writeText(itinerary()) : Promise.reject()).then(done, () => { S.toast = 'Copy not allowed here'; render(false, false); }); return; }
  if (a === 'reset') { S = fresh(); P = null; return go('home'); }
}
app.addEventListener('click', e => { const b = e.target.closest('[data-a]'); if (b && !b.disabled) act(b.dataset.a, b.dataset.v, b.dataset.k); });
app.addEventListener('change', async e => { const el = e.target.closest('[data-sel]'); if (!el) return; const k = el.dataset.sel; S.placeErr = ''; if (k === 'days') S.days = +el.value; else { const name = await Places.resolve(el.value); if (!name) S.placeErr = `Couldn’t find “${el.value}” in India. Pick from the list or try a nearby city.`; else if (k === 'to') { S.to = name; S.guessedTo = false; } else S.households.find(h => h.id === el.dataset.h).from = name; } S.stayId = null; S.forceLeg = {}; render(false, false); });
$('#reset').onclick = () => act('reset');

// ---- side panel: planner personality and AI choice ----
const drawPersonas = () => {
  const cur = AI.persona.id;
  $('#personas').innerHTML = [...PERSONAS, { id: 'custom', name: 'Your own', tag: 'Name it and say how it talks' }].map(p => `<button class="mode ${cur === p.id ? 'sel' : ''}" data-p="${p.id}"><b>${esc(p.name)}</b><span>${esc(p.tag)}</span></button>`).join('');
  $('#customP').hidden = cur !== 'custom'; if (cur === 'custom') { $('#cpn').value = AI.persona.name; $('#cps').value = AI.persona.style; }
};
const customPersona = () => ({ id: 'custom', name: $('#cpn').value.trim().slice(0, 20) || 'Kavya', style: $('#cps').value.trim().slice(0, 200) || 'Cheerful and encouraging. Keeps it short.', greet: null, ack: 'Got it.' });
$('#personas').onclick = e => { const b = e.target.closest('[data-p]'); if (!b) return; AI.setPersona(b.dataset.p === 'custom' ? customPersona() : { ...PERSONAS.find(x => x.id === b.dataset.p) }); drawPersonas(); render(false, false); };
['#cpn', '#cps'].forEach(i => $(i).onchange = () => { AI.setPersona(customPersona()); render(false, false); });
drawPersonas();

const stateTag = () => { const st = $('#aiState'); st.textContent = { device: 'On-device', key: AI.cfg.key ? 'Your key' : 'Needs key', cloud: 'Keyless', off: 'Off' }[AI.mode]; st.className = 'tag ' + (AI.mode === 'off' ? '' : AI.ready ? 'on' : 'busy'); };
const mark = () => { document.querySelectorAll('#modes .mode').forEach(b => b.classList.toggle('sel', b.dataset.mode === AI.mode)); $('#keyForm').hidden = AI.mode !== 'key'; stateTag(); render(false, false); };
const fillKey = () => { $('#kp').value = AI.cfg.preset; $('#kk').value = AI.cfg.key; $('#kb').value = AI.cfg.base; $('#km').value = AI.cfg.model; $('#kb').parentElement.hidden = AI.cfg.preset !== 'Custom'; $('#khelp').textContent = PRESETS[AI.cfg.preset].help + '. The key is kept only in this browser.'; };
$('#kp').innerHTML = Object.keys(PRESETS).map(n => `<option>${n}</option>`).join(''); fillKey();
$('#kp').onchange = () => { const p = PRESETS[$('#kp').value]; AI.cfg = { ...AI.cfg, preset: $('#kp').value, base: p.base, model: p.model }; fillKey(); };
$('#kt').onclick = async () => {
  const note = $('#aiNote'); AI.cfg = { preset: $('#kp').value, key: $('#kk').value.trim(), base: $('#kb').value.trim() || PRESETS[$('#kp').value].base, model: $('#km').value.trim() || PRESETS[$('#kp').value].model }; AI.saveCfg(); AI.mode = 'key';
  if (!AI.cfg.key || !AI.cfg.base) { note.textContent = 'Paste a key first.'; return mark(); }
  note.textContent = 'Testing…'; try { const r = await AI.chat('Reply with the single word OK.', 'ping', { max: 8 }); note.textContent = r ? 'Works. The service replied: ' + r.slice(0, 40) : 'The service answered with nothing. Check the model name.'; } catch (e) { note.textContent = 'That didn’t work: ' + (e.name === 'AbortError' ? 'it took too long' : e.message === 'Failed to fetch' ? 'the browser was blocked from reaching it (check the web address, or the service may not allow browser use)' : e.message); }
  mark();
};
document.querySelectorAll('#modes .mode').forEach(btn => btn.onclick = async () => {
  const m = btn.dataset.mode, bar = $('#aiBar'), note = $('#aiNote'); note.textContent = '';
  if (m !== 'device' || AI.engine) { AI.mode = m; if (m === 'cloud') note.textContent = 'This service has a free-use limit and may refuse. If it does, the scripted reader fills in.'; return mark(); }
  const st = $('#aiState'); st.textContent = 'Loading'; st.className = 'tag busy'; bar.hidden = false;
  try { await AI.loadDevice((p, t) => { $('#aiFill').style.width = Math.round(p * 100) + '%'; note.textContent = t || 'Loading the model…'; }); AI.mode = 'device'; note.textContent = 'Model: ' + AI.deviceModel + '. Nothing leaves this tab.'; }
  catch (err) { note.textContent = 'Could not start the on-device AI: ' + err.message; }
  bar.hidden = true; mark();
});
mark();
render();
