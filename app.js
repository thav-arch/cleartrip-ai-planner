const $ = s => document.querySelector(s), app = $('#app');
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const F = n => Engine.fmt(n), wait = ms => new Promise(r => setTimeout(r, ms));
const fresh = () => ({ screen: 'home', text: '', households: [], days: 5, cap: 15000, access: [], vibe: 'Relaxed beach', veg: false, nap: true, shift: false, remoteShort: false, dateChoice: 'shift', stayId: null, cruise: 'all', forceLeg: {}, moved: false, wish: false, applied: {}, bk: 0, sold: null, soldDone: false, fix: 0, reader: '', summary: '', busy: false });
let S = fresh(), P = null, run = 0;
const BACK = { chat: 'home', brief: 'chat', dates: 'brief', plan: 'dates', over: 'dates', stays: 'plan', family: 'stays', booking: 'stays', final: 'booking' };
const go = s => { S.screen = s; run++; render(); };
const topBar = t => `<div class="top"><button class="back" data-a="back" aria-label="Back">←</button><h2>${t}</h2></div>`;
const foot = (label, a, dis) => `<div class="foot"><button class="cta" data-a="${a}" ${dis ? 'disabled' : ''}>${label}</button></div>`;
const chips = (key, list, sel) => `<div class="chips">${list.map(l => `<button class="chip ${[].concat(sel).includes(l) ? 'sel' : ''}" data-a="set" data-k="${key}" data-v="${esc(l)}">${esc(l)}</button>`).join('')}</div>`;
const remote = () => S.households.find(h => h.from !== DATA.home);
const elders = () => Engine.people(S).filter(p => p.age >= 60), tots = () => Engine.people(S).filter(p => p.age < 6);
const range = () => `${Engine.date(S, 0)} – ${Engine.date(S, S.days - 1)}`;
const count = () => Engine.people(S).length;
const replan = () => { P = Engine.plan(S); return P; };

const V = {
  home: () => `<div class="wrap home"><div class="body">
    <div class="row c sb"><div class="logo"><i>✓</i>cleartrip</div><span class="pill">Concept</span></div>
    <div class="grid"><div class="tile"><div class="ic" style="background:#EDE7FD">🏨</div><b>Hotels</b><span>30–80% off</span></div><div class="tile"><div class="ic" style="background:#E3ECFF">✈️</div><b>Flights</b><span>Up to 25% off</span></div></div>
    <div class="grid"><div class="tile"><div class="ic" style="background:#FDE7E4">🚆</div><b>Trains</b><span>Flat 10% off</span></div><div class="tile"><div class="ic" style="background:#E2F4EA">🚌</div><b>Buses</b><span>Flat 15% off</span></div><div class="tile"><div class="ic" style="background:#E1F2FB">⛱️</div><b>Holidays</b><span>Up to 25% off</span></div></div>
    <div class="hero"><span class="o">✦ NEW · AI TRIP PLANNER</span><h3>Plan one trip that works for everyone</h3><p class="muted">Tell it who’s going. It plans around each person and helps every household agree.</p><button class="cta" data-a="start">Plan with AI</button></div>
    <div class="card dash"><p class="h">No trip plans yet</p><p class="muted">Trips you start with AI are saved here.</p></div>
  </div></div><div class="nav"><span class="a">Home</span><span>My Trips</span><span>Work</span><span>Account</span><span>Offers</span></div>`,

  chat: () => {
    const ex = ['Goa for 5 days in December with my parents, my 4-year-old and my brother’s family', '4 days in Goa with my wife and 6 friends, under ₹12,000 each', 'A week in Goa with my grandparents and my 3-year-old'];
    let b = `<div class="msg"><div class="av">✦</div><div class="bub">Tell me about the trip in your own words: where, how long, and who’s coming.</div></div>`;
    if (!S.text) b += `<p class="sec">Try one of these</p><div class="chips">${ex.map(e => `<button class="chip" data-a="example" data-v="${esc(e)}">${esc(e)}</button>`).join('')}</div>`;
    else {
      b += `<div class="msg me"><div class="bub">${esc(S.text)}</div></div>`;
      if (S.busy) b += `<div class="msg"><div class="av">✦</div><div class="bub"><div class="row c"><span class="dot spin"></span>Reading your message…</div></div></div>`;
      else b += `<div class="msg"><div class="av">✦</div><div class="bub">Got it. Here’s who I have so far:${S.households.map(h => `<div><div class="d">${esc(h.name)}${h.from !== DATA.home ? ' · from ' + h.from : ''}</div><div class="chips" style="margin-top:6px">${h.members.map(m => `<span class="chip plain">${esc(m.name)} · ${m.age}</span>`).join('')}</div></div>`).join('')}<b>${count()} travellers · ${S.households.length} household${S.households.length > 1 ? 's' : ''} · ${S.days} days</b></div></div>
        ${S.asked ? `<div class="card warn"><p class="muted" style="color:var(--ink)">This prototype only has made-up inventory for Goa, so I’ve planned Goa instead of ${esc(S.asked)}.</p></div>` : ''}
        <p class="d center">${S.reader}</p>`;
    }
    return topBar('AI trip planner') + `<div class="body">${b}</div><div class="foot"><div class="field"><textarea id="msg" placeholder="${S.text ? 'Add or correct anything…' : 'Type your trip…'}"></textarea><button class="send" data-a="send" aria-label="Send">↑</button></div>${S.text && !S.busy ? `<button class="cta" data-a="go" data-v="brief">Looks right, continue</button>` : ''}</div>`;
  },

  brief: () => topBar('Trip brief') + `<div class="body"><p class="muted">Everyone sees this brief, so expectations match before I plan.</p>
    <div class="card"><p class="h">What’s the vibe?</p><p class="d">“Goa” means different things to different people.</p>${chips('vibe', ['Relaxed beach', 'Sightseeing', 'Party', 'A mix'], S.vibe)}</div>
    ${elders().length ? `<div class="card"><p class="h">Does anyone need step-free access?</p>${chips('access', elders().map(e => e.name), S.access)}</div>` : ''}
    ${tots().length ? `<div class="card"><p class="h">Does ${esc(tots().map(t => t.name).join(' or '))} nap in the afternoon?</p><p class="d">I’ll keep 1–3 pm free and avoid packed days.</p>${chips('nap', ['Yes', 'No'], S.nap ? 'Yes' : 'No')}</div>` : ''}
    <div class="card"><p class="h">Does anyone need a pure-veg kitchen?</p>${chips('veg', ['Yes', 'No'], S.veg ? 'Yes' : 'No')}</div>
    <div class="card"><p class="h">Budget cap per person</p><p class="d">Set to the lowest ceiling in the group. I won’t go above it.</p><div class="row c sb"><span class="big" id="capv">${F(S.cap)}</span><span class="pill">All travel + stay</span></div><input type="range" id="cap" min="6000" max="25000" step="500" value="${S.cap}"></div>
  </div>` + foot('Save brief', 'saveBrief'),

  dates: () => {
    const r = remote(), want = `${Engine.date({ ...S, shift: false }, 0)} – ${Engine.date({ ...S, shift: false }, S.days - 1)}`, free = `${Engine.date({ ...S, shift: true }, 0)} – ${Engine.date({ ...S, shift: true }, S.days - 1)}`;
    return topBar('Dates') + `<div class="body"><p class="muted">Each household adds its own dates from a link. No login needed. (Simulated here.)</p>
    <div class="card" style="gap:0;padding:0">${S.households.map((h, i) => `<div class="row c" style="padding:12px 14px;${i ? 'border-top:1px solid var(--line)' : ''}"><div class="grow"><div class="t">${esc(h.name)}</div><div class="d">${h === r ? free + ' only' : i ? 'Any dates' : want}</div></div><span class="pill g">Added</span></div>`).join('')}</div>
    ${r ? `<div class="card warn"><p class="h">⚠ Dates don’t line up</p><p class="muted" style="color:var(--ink)">${esc(r.name)} is free ${free} only. You asked for ${want}.</p>
      <button class="opt ${S.dateChoice === 'shift' ? 'sel' : ''}" data-a="date" data-v="shift"><span class="radio"></span><span><b>Shift to ${free}</b><div class="d">Everyone can come for all ${S.days} days.</div><span class="pill g">Recommended</span></span></button>
      <button class="opt ${S.dateChoice === 'keep' ? 'sel' : ''}" data-a="date" data-v="keep"><span class="radio"></span><span><b>Keep ${want}</b><div class="d">${esc(r.name)} joins for ${Math.max(2, S.days - 2)} days.</div></span></button></div>` : `<div class="card soft"><p class="muted">Everyone is free on the same dates.</p></div>`}
  </div>` + foot(r && S.dateChoice === 'shift' ? 'Shift the dates' : 'Confirm dates', 'saveDates');
  },

  planning: () => topBar('Planning') + `<div class="body"><p class="big" style="font-size:20px;margin:0">Planning around ${count()} ${count() > 1 ? 'people' : 'person'}</p><p class="muted">You can see every step I take.</p>
    <div class="card" style="gap:12px">${P.steps.map(s => `<div class="row step"><span class="dot ${s.warn ? 'bad' : 'ok'}">${s.warn ? '!' : '✓'}</span><div class="grow"><div style="font-size:14px">${esc(s.t)}</div>${s.who ? `<span class="pill" style="margin-top:4px">For ${esc(s.who)}</span>` : ''}</div></div>`).join('')}<div class="row step" id="last"><span class="dot spin"></span><div class="grow muted">Putting the plan together…</div></div></div></div>`,

  over: () => {
    const fx = Engine.fixes(S, P);
    return topBar('Your trip plan') + `<div class="body"><div class="card warn"><p class="h">⚠ This plan is ${F(P.per - S.cap)} over your cap</p><p class="muted" style="color:var(--ink)">That’s per person. I won’t go above ${F(S.cap)} unless every household agrees. Here are ways to fix it:</p>
    ${fx.map((f, i) => `<button class="opt ${S.fix === i ? 'sel' : ''}" data-a="fix" data-v="${i}"><span class="radio"></span><span><b>${esc(f.t)}</b><div class="d">${esc(f.d)}</div></span></button>`).join('')}</div></div>` + foot('Apply and re-plan', 'applyFix');
  },

  plan: () => {
    const icon = { train: '🚆', bus: '🚌', flight: '✈️' };
    const base = [DATA.days[0], DATA.days[1], DATA.days[2], DATA.days[3], DATA.days[5], DATA.days[6]].slice(0, S.days - 1).concat(DATA.days[4]);
    return topBar('Your trip plan') + `<div class="body">
    <div class="card"><div><div class="lab">Where to?</div><div class="val">Goa</div></div><hr><div class="row c sb"><div><div class="lab">Start</div><div class="val">${Engine.date(S, 0)}</div></div><span class="pill">${S.days - 1} NIGHTS</span><div style="text-align:right"><div class="lab">End</div><div class="val">${Engine.date(S, S.days - 1)}</div></div></div><hr><div><div class="lab">Travellers</div><div class="val">${count()} travellers, ${S.households.length} household${S.households.length > 1 ? 's' : ''}</div></div><hr>
      <div class="row sb" style="align-items:flex-end"><div><div class="big">${F(P.total)}</div><div class="d">${F(P.per)} per person</div></div><span class="pill g">Under your ${F(S.cap)} cap</span></div>
      <div class="split">${S.households.map(h => `<div><span class="d">${esc(h.id === 'h1' ? 'You' : h.name.replace(/^Your /, '').replace(/’s household/, ''))}</span><b>${F(P.shares[h.id])}</b></div>`).join('')}</div></div>
    ${S.summary ? `<div class="card note"><p class="d" style="color:var(--blue);font-weight:600">In short · written by the on-device AI</p><p class="muted" style="color:var(--ink)">${esc(S.summary)}</p></div>` : ''}
    <p class="sec">Getting there</p>
    ${P.legs.map(l => `<div class="card"><div class="row"><div class="ic" style="background:var(--bg);border-radius:8px">${icon[l.opt.mode]}</div><div class="grow"><div class="t">${l.opt.name} · ${l.city} → Goa</div><div class="d">${l.opt.note ? 'Leaves the ' + l.opt.note + ', ' : ''}${l.opt.dep} → ${l.opt.arr} · ${l.count} traveller${l.count > 1 ? 's' : ''} · ${F(l.opt.price)} each way</div></div></div><div class="why">Why: ${esc(l.why)}.</div></div>`).join('')}
    <p class="sec">Stay</p><div class="card dash"><p class="h">${P.stays.length} stays shortlisted</p><p class="muted">I never pick your stay for you. You choose from the shortlist. The total above assumes ${esc(P.stay.name)} for now.</p></div>
    <p class="sec">Day by day</p>
    ${base.map((d, i) => { const heavy = d.heavy && S.nap && tots().length && !S.moved; let t = d.t; if (d.heavy && S.moved) t = 'Market and a spice farm'; if (d.cruise && S.cruise === 'none') t = 'Old Goa churches, free evening'; if (d.cruise && S.cruise === 'optional') t += ' (optional)'; const lv = d.heavy && S.moved ? 2 : d.level;
      return `<div class="card ${heavy ? 'warn' : ''}"><div class="row c sb"><div><div class="t">Day ${i + 1} · ${Engine.date(S, i).split(',')[0]}</div><div class="d">${t}</div></div><div class="bars ${heavy ? 'hv' : ''}">${[0, 1, 2, 3].map(k => `<i class="${k < lv ? 'f' : ''}"></i>`).join('')}</div></div>${heavy ? `<p class="muted" style="color:var(--ink)">Packed. Too much walking for ${esc(tots().map(t => t.name).join(' and '))}, and no nap window.</p><div class="row"><button class="sm k" data-a="move">Move the fort visit</button><button class="sm" data-a="keepDay">Keep it</button></div>` : ''}</div>`; }).join('')}
  </div>` + foot('Choose your stay', 'go" data-v="stays');
  },

  stays: () => topBar('Choose your stay') + `<div class="body"><p class="muted">${P.stays.length} stays that fit your brief. I checked each one. You pick.</p>
    ${P.stays.map((s, i) => `<div class="card" ${i === 0 ? 'style="border-color:var(--orange)"' : ''}>${i === 0 ? `<div class="photo"><span class="pill" style="background:#fff;color:var(--ink)">Photo slot · guest photos and reels</span></div>` : ''}
      <div class="row sb"><div><div class="h" style="font-size:16px">${s.name}</div><div class="d">${s.area}${i ? ` · ${s.room < P.stays[0].room ? F(P.stays[0].room - s.room) + ' less' : F(s.room - P.stays[0].room) + ' more'} a room a night` : ''}</div></div><div style="text-align:right"><b>${F(s.room)}</b><div class="d">room / night</div></div></div>
      ${s.reasons.map(r => `<div class="tick">${esc(r)}</div>`).join('')}
      <div class="chips"><span class="chip plain">★ ${s.rating} · ${s.reviews} reviews</span><span class="chip plain">Host for ${s.hostYears} years</span></div>
      <div class="quote">“${s.quote}”<div class="d">Verified stay (sample review)</div></div>
      <button class="${i === 0 ? 'cta' : 'sm'}" data-a="pick" data-v="${s.id}">Pick ${i === 0 ? 'this stay' : s.name}</button></div>`).join('')}</div>`,

  family: () => { const r = remote(); return topBar('Family review') + `<div class="body"><div class="card soft"><p class="h">Shared with ${S.households.length} households</p><p class="muted">Family members suggest. You make the final call. (Their replies are simulated.)</p></div>
    ${r && S.cruise !== 'none' ? `<div class="card"><p class="d">${esc(r.members[0].name)} · ${esc(r.name)}</p><p class="h">“Can we skip the sunset cruise? It’s over our budget.”</p><div class="why">Suggestion: make the cruise optional. Only those who join pay. ${esc(r.name)} saves ${F(DATA.perPerson.cruise * r.members.length)}.</div>${S.applied.cruise ? `<span class="pill g">${S.applied.cruise}</span>` : `<div class="row"><button class="sm k" data-a="sug" data-k="cruise" data-v="yes">Make it optional</button><button class="sm" data-a="sug" data-k="cruise" data-v="no">Keep as is</button></div>`}</div>` : ''}
    <div class="card"><p class="d">${esc(Engine.people(S).filter(p => p.age >= 6 && p.age < 18)[0]?.name || S.households[S.households.length - 1].members[0].name)} · added to the wishlist</p><p class="h">Cabo de Rama fort, from a reel they shared</p><div class="why">It fits Day 3, on the way back. Open daily, 9 am – 5:30 pm. Adds 40 minutes and no cost.</div>${S.applied.wish ? `<span class="pill g">${S.applied.wish}</span>` : `<div class="row"><button class="sm k" data-a="sug" data-k="wish" data-v="yes">Add to Day 3</button><button class="sm" data-a="sug" data-k="wish" data-v="no">Not this trip</button></div>`}</div>
    <div class="card soft"><div class="row sb c"><span class="muted">Total now</span><b>${F(P.total)} · ${F(P.per)} each</b></div></div></div>` + foot('Finalise plan', 'go" data-v="booking'); },

  booking: () => {
    const items = bookItems();
    return topBar('Booking') + `<div class="body"><p class="muted">I book in order and stop the moment anything changes. (Nothing is really booked.)</p>
    <div class="card" style="gap:0;padding:0">${items.map((it, i) => { const st = S.sold && S.sold.i === i ? 'bad' : S.sold && it.hold ? 'hold' : i < S.bk ? (it.hold ? 'hold' : 'ok') : i === S.bk && !S.sold ? 'spin' : ''; return `<div class="row" style="padding:12px 14px;${i ? 'border-top:1px solid var(--line)' : ''}"><span class="dot ${st}">${st === 'ok' ? '✓' : st === 'bad' ? '!' : st === 'hold' ? '◷' : ''}</span><div class="grow"><div class="t">${it.t}</div><div class="d" ${st === 'bad' ? 'style="color:var(--amber)"' : ''}>${st === 'bad' ? 'Sold out while booking' : st === 'ok' ? it.done : st === 'hold' ? 'On hold for 20 minutes' : st === 'spin' ? 'Booking…' : 'Waiting'}</div></div></div>`; }).join('')}</div>
    ${S.sold ? `<div class="card warn"><p class="h">⚠ The ${S.sold.opt.dep} flight just sold out</p><p class="muted" style="color:var(--ink)">I’ve held your stay so you don’t lose it. Pick another flight from ${S.sold.city}:</p>${S.sold.alts.map((o, i) => `<button class="opt ${S.sold.pick === i ? 'sel' : ''}" data-a="alt" data-v="${i}"><span class="radio"></span><span><b>${o.dep} flight</b><div class="d">${o.price >= S.sold.opt.price ? '+' : '−'}${F(Math.abs(o.price - S.sold.opt.price))} per person each way · arrives ${o.arr}${o.depHour < 8 ? ' · an early start for the kids' : ''}</div>${o.depHour >= 8 ? '<span class="pill g">Recommended</span>' : ''}</span></button>`).join('')}</div>` : ''}</div>` + (S.sold ? foot(`Book the ${S.sold.alts[S.sold.pick].dep} flight`, 'bookAlt') : foot('Review and pay', 'go" data-v="final', S.bk < items.length));
  },

  final: () => topBar('Review') + `<div class="body"><p class="muted">Everything is booked or on hold. You make the final call.</p>
    <div class="card" style="gap:0;padding:0">${bookItems().map((it, i) => `<div class="row" style="padding:12px 14px;${i ? 'border-top:1px solid var(--line)' : ''}"><span class="dot ${it.hold ? 'hold' : 'ok'}">${it.hold ? '◷' : '✓'}</span><div class="grow"><div class="t">${it.t}</div><div class="d">${it.hold ? 'On hold · free cancellation until 20 Dec' : it.done}</div></div></div>`).join('')}</div>
    <div class="card"><div class="row sb c"><span class="muted">Total for ${count()}</span><span class="big" style="font-size:18px">${F(P.total)}</span></div><div class="row sb c"><span class="muted">Per person</span><span><b>${F(P.per)}</b> <span class="pill ${P.over ? 'a' : 'g'}">${P.over ? 'Over cap' : 'Under cap'}</span></span></div>${S.households.map(h => `<hr><div class="row sb c"><span style="font-size:13px">${esc(h.name)} (${h.members.length})</span><b style="font-size:13px">${F(P.shares[h.id])}</b></div>`).join('')}</div>
    <div class="card note"><p class="h" style="color:var(--blue)">What I leave to you</p><p class="muted" style="color:var(--ink)">Paying, confirming the final booking, and messaging the host. I draft, you decide.</p></div></div>` + foot(`Pay your share · ${F(P.shares[S.households[0].id])}`, 'go" data-v="done'),

  done: () => `<div class="body"><div class="ok-badge">✓</div><p class="big center" style="margin:0">You’re going to Goa</p><p class="muted center">${range()} · ${count()} travellers · ${S.households.length} household${S.households.length > 1 ? 's' : ''}</p>
    <div class="card"><p class="sec" style="margin:0">I’ll remind you</p>${P.legs.map(l => `<div class="row"><span class="dot hold">◷</span><div class="grow"><div class="t">${l.opt.name} from ${l.city}</div><div class="d">Leaves ${l.opt.note ? 'the ' + l.opt.note + ' at ' : 'at '}${l.opt.dep}.</div></div></div>`).join('')}${S.moved ? `<div class="row"><span class="dot hold">◷</span><div class="grow"><div class="t">Fort visit moved</div><div class="d">Day 3 morning, before the nap.</div></div></div>` : ''}</div>
    <div class="card soft"><p class="h">Payment stops here</p><p class="muted">This is a concept prototype. Nothing was booked or charged.</p></div></div>` + foot('Plan another trip', 'reset')
};

function bookItems() {
  const a = P.legs.map(l => ({ t: `${l.opt.name} · ${l.city} → Goa, ${l.opt.dep}`, done: `${l.count} seat${l.count > 1 ? 's' : ''} confirmed`, leg: l }));
  a.push({ t: `Stay · ${P.stay.name}`, hold: true, done: '' }, { t: `Cabs · ${P.legs.length} pickup${P.legs.length > 1 ? 's' : ''}`, done: 'Timed to each arrival' });
  return a;
}
async function animatePlanning() {
  const me = run; const steps = [...app.querySelectorAll('.step')];
  for (const s of steps) { await wait(550); if (me !== run) return; s.classList.add('in'); }
  await wait(900); if (me !== run) return;
  if (AI.ready && !P.over) { try { const st = P.stay; S.summary = await AI.summarise(`Travellers: ${Engine.people(S).map(p => p.name + ' (' + p.age + ')').join(', ')}. Step-free access needed by: ${S.access.join(', ') || 'no one'}. Vibe: ${S.vibe}. Transport: ${P.legs.map(l => l.opt.name + ' from ' + l.city + ' leaving ' + l.opt.dep).join('; ')}. Top stay: ${st.name} in ${st.area}, ${st.reasons.join(', ')}. Cost per person: ${Math.round(P.per)} rupees against a cap of ${S.cap}.`); } catch (e) { S.summary = ''; } if (me !== run) return; }
  go(P.over ? 'over' : 'plan');
}
async function animateBooking() {
  const me = run, items = bookItems();
  while (S.bk < items.length && !S.sold) {
    await wait(900); if (me !== run) return;
    const it = items[S.bk]; if (!it) return;
    if (it.leg && it.leg.opt.sellsOut && !S.soldDone) { S.sold = { i: S.bk, city: it.leg.city, opt: it.leg.opt, alts: DATA.transport[it.leg.city].filter(o => o.id !== it.leg.opt.id).sort((a, b) => (b.depHour >= 8) - (a.depHour >= 8)), pick: 0 }; }
    else S.bk++;
    render(false, false);
  }
}
async function read(text) {
  S.text = text; S.busy = true; S.summary = ''; render();
  const base = Engine.parse(text); let got = null;
  if (AI.ready) { try { got = await AI.readBrief(text); } catch (e) { got = null; } } else await wait(700);
  Object.assign(S, { households: base.households, days: base.days, cap: base.cap, asked: base.asked }, got || {});
  S.reader = got ? 'Read by the on-device AI (' + AI.model + ')' : AI.ready ? 'The on-device AI gave an unclear answer, so the scripted reader was used' : 'Read by the scripted reader · on-device AI is off';
  S.access = elders().slice(0, 1).map(e => e.name); S.veg = elders().length > 0; S.busy = false; S.stayId = null; S.forceLeg = {}; S.soldDone = false; S.applied = {}; S.cruise = 'all'; S.moved = false;
  render();
}
function render(scroll = true, anim = true) {
  const keep = app.querySelector('.body')?.scrollTop || 0;
  app.className = 'screen'; app.innerHTML = V[S.screen]();
  const b = app.querySelector('.body'); if (b) b.scrollTop = scroll ? (S.screen === 'chat' ? b.scrollHeight : 0) : keep;
  if (anim && S.screen === 'planning') animatePlanning();
  if (anim && S.screen === 'booking' && !S.sold) animateBooking();
  const cap = $('#cap'); if (cap) cap.oninput = () => { S.cap = +cap.value; $('#capv').textContent = F(S.cap); };
  const msg = $('#msg'); if (msg) msg.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); act('send'); } };
}
function act(a, v, k) {
  if (a === 'back') return go(BACK[S.screen] || 'home');
  if (a === 'start') return go('chat');
  if (a === 'go') { if (v === 'booking' || v === 'stays' || v === 'final' || v === 'done') replan(); if (v === 'booking') { S.bk = 0; S.sold = null; } return go(v); }
  if (a === 'example') return read(v);
  if (a === 'send') { const t = $('#msg').value.trim(); if (t) read(S.text && S.households.length ? S.text + '. ' + t : t); return; }
  if (a === 'set') { if (k === 'access') S.access = S.access.includes(v) ? S.access.filter(x => x !== v) : [...S.access, v]; else if (k === 'nap' || k === 'veg') S[k] = v === 'Yes'; else S[k] = v; return render(false); }
  if (a === 'saveBrief') return go('dates');
  if (a === 'date') { S.dateChoice = v; return render(false); }
  if (a === 'saveDates') { const r = remote(); S.shift = !!r && S.dateChoice === 'shift'; S.remoteShort = !!r && S.dateChoice === 'keep'; replan(); return go('planning'); }
  if (a === 'fix') { S.fix = +v; return render(false); }
  if (a === 'applyFix') { Engine.fixes(S, P)[S.fix].apply(); S.fix = 0; replan(); return go('planning'); }
  if (a === 'move') { S.moved = true; return render(false); }
  if (a === 'keepDay') { S.nap = false; return render(false); }
  if (a === 'pick') { S.stayId = v; replan(); return go(P.over ? 'over' : S.households.length > 1 ? 'family' : 'booking'); }
  if (a === 'sug') { if (k === 'cruise') { if (v === 'yes') S.cruise = 'optional'; S.applied.cruise = v === 'yes' ? 'Cruise made optional' : 'Kept as is'; } else S.applied.wish = v === 'yes' ? 'Added to Day 3' : 'Left out'; replan(); return render(false); }
  if (a === 'alt') { S.sold.pick = +v; return render(false); }
  if (a === 'bookAlt') { S.forceLeg[S.sold.city] = S.sold.alts[S.sold.pick].id; S.soldDone = true; S.sold = null; replan(); S.bk++; run++; return render(false); }
  if (a === 'reset') { S = fresh(); P = null; return go('home'); }
}
app.addEventListener('click', e => { const b = e.target.closest('[data-a]'); if (b && !b.disabled) act(b.dataset.a, b.dataset.v, b.dataset.k); });
$('#reset').onclick = () => act('reset');
$('#aiBtn').onclick = async () => {
  const btn = $('#aiBtn'), st = $('#aiState'), bar = $('#aiBar'), note = $('#aiNote');
  btn.disabled = true; st.textContent = 'Loading'; st.className = 'tag busy'; bar.hidden = false;
  try { await AI.load((p, t) => { $('#aiFill').style.width = Math.round(p * 100) + '%'; note.textContent = t || 'Loading the model…'; });
    st.textContent = 'On'; st.className = 'tag on'; bar.hidden = true; btn.textContent = 'On-device AI is on'; note.textContent = 'Model: ' + AI.model + '. It now reads your message and writes the plan summary. Nothing leaves this tab.';
  } catch (err) { st.textContent = 'Unavailable'; st.className = 'tag'; bar.hidden = true; btn.disabled = false; btn.textContent = 'Try again'; note.textContent = 'Could not start the on-device AI: ' + err.message + ' The scripted reader is being used instead.'; }
};
render();
