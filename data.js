// Mock inventory, generated from distances. Every price, time and stay here is invented.
const CITIES = { Bengaluru: [12.97, 77.59], Delhi: [28.61, 77.21], Mumbai: [19.08, 72.88], Chennai: [13.08, 80.27], Hyderabad: [17.39, 78.49], Pune: [18.52, 73.86], Kolkata: [22.57, 88.36], Indore: [22.72, 75.86], Ahmedabad: [23.02, 72.57] };
const DEST = {
  Goa: { at: [15.3, 74.0], centre: 'the beach', mult: 1, areas: ['Benaulim', 'Colva', 'Varca', 'Loutolim', 'Baga', 'Anjuna'], sights: ['Aguada fort', 'Mapusa market', 'a spice farm', 'Old Goa churches'], extra: 'sunset river cruise', wish: 'Cabo de Rama fort' },
  Jaipur: { at: [26.91, 75.79], centre: 'the old city', mult: 0.9, areas: ['Bani Park', 'C-Scheme', 'Amer Road', 'Civil Lines', 'MI Road', 'Jawahar Nagar'], sights: ['Amber Fort', 'Johari Bazaar', 'City Palace', 'Jantar Mantar'], extra: 'hot-air balloon ride', wish: 'Panna Meena stepwell' },
  Manali: { at: [32.24, 77.19], centre: 'Mall Road', mult: 0.95, noTrain: true, noFlight: true, areas: ['Old Manali', 'Log Huts Road', 'Aleo', 'Vashisht', 'Mall Road', 'Hadimba Road'], sights: ['Solang Valley', 'Hadimba temple', 'the Old Manali cafés', 'Vashisht springs'], extra: 'paragliding session', wish: 'Jogini waterfall' },
  Kochi: { at: [9.93, 76.27], centre: 'the waterfront', mult: 1, areas: ['Fort Kochi', 'Mattancherry', 'Marine Drive', 'Vypin', 'Kumbalangi', 'Willingdon Island'], sights: ['the Fort Kochi walk', 'Mattancherry palace', 'the Chinese fishing nets', 'Jew Town market'], extra: 'backwater houseboat day', wish: 'Kumbalangi village' },
  Udaipur: { at: [24.58, 73.71], centre: 'the lake', mult: 1.05, areas: ['Lal Ghat', 'Hanuman Ghat', 'Fateh Sagar', 'Ambamata', 'Chandpole', 'Sajjangarh Road'], sights: ['City Palace', 'Jagdish temple', 'Saheliyon ki Bari', 'Bagore ki Haveli'], extra: 'Lake Pichola boat ride', wish: 'the Monsoon Palace at sunset' },
  Pondicherry: { at: [11.94, 79.81], centre: 'the promenade', mult: 0.9, areas: ['White Town', 'Auroville Road', 'Serenity Beach', 'Heritage Town', 'Mission Street', 'Paradise Beach Road'], sights: ['the White Town walk', 'Auroville', 'Paradise Beach', 'the Sunday market'], extra: 'intro scuba dive', wish: 'Serenity Beach at sunrise' }
};
const STAY_T = [
  { n: 'Garden Villa', room: 2250, groundFloor: true, kidsPool: true, veg: true, quiet: true, far: 6, rating: 4.6, reviews: 212, hostYears: 6, quote: 'Calm and spotless. Easy for our parents.' },
  { n: 'Homestay', room: 1750, groundFloor: true, veg: true, quiet: true, far: 20, rating: 4.4, reviews: 96, hostYears: 3, quote: 'Simple, clean, and the host cooks to order.' },
  { n: 'Residency', room: 2650, lift: true, kidsPool: true, quiet: false, far: 1, rating: 4.7, reviews: 340, hostYears: 9, quote: 'Right in the middle of things. Music until late.' },
  { n: 'Heritage Home', room: 1950, groundFloor: true, veg: true, quiet: true, far: 35, rating: 4.8, reviews: 64, hostYears: 11, quote: 'Peaceful old house. You need a cab to get around.' },
  { n: 'Rooms', room: 1500, quiet: false, far: 4, rating: 4.1, reviews: 510, hostYears: 5, quote: 'Great for going out. Rooms are up two flights.' },
  { n: 'Hill House', room: 2100, kidsPool: true, quiet: true, far: 12, rating: 4.5, reviews: 150, hostYears: 4, quote: 'Lovely views, lots of steps.' }
];
const DATA = {
  perPerson: { cabs: 450, food: 1500, extra: 1200 },
  km(a, b) { const R = 6371, r = x => x * Math.PI / 180, dLa = r(b[0] - a[0]), dLo = r(b[1] - a[1]); const h = Math.sin(dLa / 2) ** 2 + Math.cos(r(a[0])) * Math.cos(r(b[0])) * Math.sin(dLo / 2) ** 2; return Math.round(2 * R * Math.asin(Math.sqrt(h)) * 1.25); },
  clock(h) { h = ((h % 24) + 24) % 24; let H = Math.floor(h), m = Math.round((h - H) * 60 / 5) * 5; if (m === 60) { m = 0; H = (H + 1) % 24; } return `${H % 12 || 12}:${String(m).padStart(2, '0')} ${H < 12 ? 'am' : 'pm'}`; },
  r50: n => Math.round(n / 50) * 50,
  route(from, to) {
    const d = this.km(CITIES[from], DEST[to].at), D = DEST[to], o = [];
    const add = (id, mode, name, depHour, hrs, price, x = {}) => o.push({ id: id, mode, name, depHour, dep: this.clock(depHour), arr: this.clock(depHour + hrs), price: this.r50(price), hrs, ...x });
    if (!D.noFlight && d > 300) { const t = 0.9 + d / 750, p = 2200 + d * 2.6; add('fl-early', 'flight', 'Flight', 6.1, t, p - 400); add('fl-mid', 'flight', 'Flight', 9.83, t, p, { sellsOut: true }); add('fl-late', 'flight', 'Flight', 11.25, t, p + 800); }
    if (!D.noTrain && d < 1900) { add('tr-night', 'train', 'Overnight train', 20.67, d / 55, 600 + d * 1.5, { lowerBerths: true, note: 'night before' }); if (d < 750) add('tr-day', 'train', 'Day train', 6.25, d / 50, 300 + d); }
    if (d < 800) add('bus-night', 'bus', 'Sleeper bus', 21.5, d / 48, 500 + d * 1.1, { hardForElders: true, note: 'night before' });
    if (!o.length) add('bus-long', 'bus', 'Volvo coach via Delhi', 17, d / 45, 900 + d * 1.2, { note: 'day before' });
    return { km: d, opts: o };
  },
  stays(to) { const D = DEST[to]; return STAY_T.map((t, i) => ({ ...t, id: 's' + i, name: `${D.areas[i]} ${t.n}`, area: D.areas[i], room: this.r50(t.room * D.mult), far: t.far })); }
};
