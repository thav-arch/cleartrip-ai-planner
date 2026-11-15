// Real-world data from OpenStreetMap (free, no key): place lookup, real stays and sights.
// Everything here fails soft: if a service is unreachable the app falls back to sample data.
const Places = {
  cache: {}, pending: {},
  async json(url, opts = {}, ms = 12000) {
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), ms);
    try { const r = await fetch(url, { ...opts, signal: ctl.signal }); if (!r.ok) throw new Error('HTTP ' + r.status); return await r.json(); } finally { clearTimeout(t); }
  },
  generic(lat, lon) { return { at: [lat, lon], centre: 'the town centre', mult: 1, areas: [], sights: ['the old town walk', 'the main market', 'a local temple or monument', 'the best viewpoint nearby'], extra: 'a guided local tour', wish: 'a local viewpoint', generic: true }; },
  register(name, lat, lon) { CITIES[name] = [lat, lon]; if (!DEST[name]) DEST[name] = this.generic(lat, lon); },
  known(raw) { const t = String(raw).trim().toLowerCase(); return [...Object.keys(CITIES), ...Object.keys(DEST)].find(n => n.toLowerCase() === t) || null; },
  names() { return [...new Set([...Object.keys(CITIES), ...Object.keys(DEST)])].sort(); },
  async resolve(raw) {
    raw = String(raw || '').trim(); if (!raw) return null;
    const alias = { bangalore: 'Bengaluru', bombay: 'Mumbai', calcutta: 'Kolkata', kerala: 'Kochi', cochin: 'Kochi', pondy: 'Pondicherry', puducherry: 'Pondicherry' }[raw.toLowerCase()];
    const k = this.known(alias || raw); if (k) { this.register(k, ...(CITIES[k] || DEST[k].at)); return k; }
    try {
      const r = await this.json('https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=in&q=' + encodeURIComponent(raw));
      if (!r.length) return null;
      const name = (r[0].name || r[0].display_name.split(',')[0]).trim(); this.register(name, +r[0].lat, +r[0].lon); return name;
    } catch (e) { return null; }
  },
  km(a, b) { const R = 6371, r = x => x * Math.PI / 180, dLa = r(b[0] - a[0]), dLo = r(b[1] - a[1]); const h = Math.sin(dLa / 2) ** 2 + Math.cos(r(a[0])) * Math.cos(r(b[0])) * Math.sin(dLo / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); },
  load(name) {
    if (this.cache[name]) return Promise.resolve(this.cache[name]);
    if (this.pending[name]) return this.pending[name];
    const [lat, lon] = DEST[name].at;
    const q = `[out:json][timeout:20];(node["tourism"~"^(hotel|guest_house|hostel|resort|apartment|motel)$"]["name"](around:12000,${lat},${lon});way["tourism"~"^(hotel|guest_house|resort|apartment|motel)$"]["name"](around:12000,${lat},${lon});node["tourism"~"^(attraction|viewpoint|museum)$"]["name"](around:15000,${lat},${lon});way["tourism"~"^(attraction|museum)$"]["name"](around:15000,${lat},${lon});node["historic"]["name"]["wikidata"](around:15000,${lat},${lon}););out center tags 250;`;
    const hosts = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];
    this.pending[name] = (async () => {
      let els = null;
      for (const h of hosts) { try { els = (await this.json(h, { method: 'POST', body: 'data=' + encodeURIComponent(q) }, 20000)).elements; if (els) break; } catch (e) { /* try next */ } }
      const out = { real: false, stays: [], sights: [] };
      if (els) {
        const seen = new Set(), here = [lat, lon];
        const pos = e => e.lat != null ? [e.lat, e.lon] : e.center ? [e.center.lat, e.center.lon] : null;
        const stays = [], sights = [];
        for (const e of els) { const t = e.tags || {}, p = pos(e); if (!t.name || !p) continue; const key = t.name.toLowerCase(); if (seen.has(key)) continue; seen.add(key);
          const d = this.km(here, p);
          if (/^(hotel|guest_house|hostel|resort|apartment|motel)$/.test(t.tourism || '')) {
            const stars = parseInt(t.stars) || 0, base = { hostel: 900, guest_house: 1400, motel: 1500, apartment: 1900, resort: 4200 }[t.tourism] || [1800, 1200, 1500, 2400, 4200, 7500][stars] || 1800;
            stays.push({ id: 'r' + e.id, real: true, name: t.name, area: t['addr:suburb'] || t['addr:city'] || t['addr:street'] || '', room: DATA.r50(stars && t.tourism === 'hotel' ? [1800, 1200, 1500, 2400, 4200, 7500][stars] : base), est: true, stars, groundFloor: t.wheelchair === 'yes', stepUnknown: !t.wheelchair, kidsPool: t.swimming_pool === 'yes' || t.leisure === 'swimming_pool', veg: /^(yes|only)$/.test(t['diet:vegetarian'] || '') ? true : undefined, far: Math.max(2, Math.round(d * 3)), lat: p[0], lon: p[1], website: t.website || t['contact:website'] || '', tagScore: (t.wheelchair ? 2 : 0) + (stars ? 2 : 0) + (t.website ? 1 : 0) + (t.phone ? 1 : 0) });
          } else sights.push({ name: t.name, d, score: (t.wikidata ? 3 : 0) + (t.wikipedia ? 2 : 0) + (t.tourism === 'attraction' ? 1 : 0) });
        }
        out.stays = stays.sort((a, b) => (b.tagScore - a.tagScore) || (a.far - b.far)).slice(0, 14);
        out.sights = sights.sort((a, b) => (b.score - a.score) || (a.d - b.d)).slice(0, 6).map(s => s.name);
        out.real = out.stays.length >= 3;
      }
      this.cache[name] = out; delete this.pending[name]; return out;
    })();
    return this.pending[name];
  }
};
