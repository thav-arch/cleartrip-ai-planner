// Mock inventory. Every price, time and place here is invented for the prototype.
const DATA = {
  home: 'Bengaluru', remote: 'Delhi',
  transport: {
    Bengaluru: [
      { id: 'tr-night', mode: 'train', name: 'Overnight train', dep: '8:40 pm', arr: '7:10 am', depHour: 20.6, price: 1450, lowerBerths: true, note: 'night before' },
      { id: 'tr-day', mode: 'train', name: 'Day train', dep: '6:15 am', arr: '6:40 pm', depHour: 6.25, price: 850, lowerBerths: false },
      { id: 'bus-night', mode: 'bus', name: 'Sleeper bus', dep: '9:30 pm', arr: '8:00 am', depHour: 21.5, price: 1100, lowerBerths: false, hardForElders: true, note: 'night before' },
      { id: 'fl-early', mode: 'flight', name: 'Flight', dep: '6:05 am', arr: '7:20 am', depHour: 6.1, price: 4200 },
      { id: 'fl-mid', mode: 'flight', name: 'Flight', dep: '10:30 am', arr: '11:45 am', depHour: 10.5, price: 5100 }
    ],
    Delhi: [
      { id: 'dl-early', mode: 'flight', name: 'Flight', dep: '7:05 am', arr: '9:40 am', depHour: 7.1, price: 6900 },
      { id: 'dl-mid', mode: 'flight', name: 'Flight', dep: '9:50 am', arr: '12:25 pm', depHour: 9.8, price: 7300, sellsOut: true },
      { id: 'dl-late', mode: 'flight', name: 'Flight', dep: '11:15 am', arr: '1:50 pm', depHour: 11.25, price: 8100 }
    ]
  },
  stays: [
    { id: 'casa', name: 'Casa Verde Villa', area: 'Benaulim', room: 2250, groundFloor: true, lift: false, kidsPool: true, veg: true, quiet: true, beachMin: 6, rating: 4.6, reviews: 212, hostYears: 6, quote: 'Calm and spotless. Easy for our parents.' },
    { id: 'palm', name: 'Palm Court Homestay', area: 'Colva', room: 1750, groundFloor: true, lift: false, kidsPool: false, veg: true, quiet: true, beachMin: 20, rating: 4.4, reviews: 96, hostYears: 3, quote: 'Simple, clean, and the host cooks to order.' },
    { id: 'sea', name: 'Sea Breeze Residency', area: 'Varca', room: 2650, groundFloor: false, lift: true, kidsPool: true, veg: false, quiet: false, beachMin: 1, rating: 4.7, reviews: 340, hostYears: 9, quote: 'On the sand. Music from the shack until late.' },
    { id: 'river', name: 'Riverside Heritage Home', area: 'Loutolim', room: 1950, groundFloor: true, lift: false, kidsPool: false, veg: true, quiet: true, beachMin: 35, rating: 4.8, reviews: 64, hostYears: 11, quote: 'Peaceful old house. You need a cab for the beach.' },
    { id: 'coco', name: 'Coco Grove Rooms', area: 'Baga', room: 1500, groundFloor: false, lift: false, kidsPool: false, veg: false, quiet: false, beachMin: 4, rating: 4.1, reviews: 510, hostYears: 5, quote: 'Great for nightlife. Rooms are up two flights.' },
    { id: 'hill', name: 'Anjuna Hill House', area: 'Anjuna', room: 2100, groundFloor: false, lift: false, kidsPool: true, veg: false, quiet: true, beachMin: 12, rating: 4.5, reviews: 150, hostYears: 4, quote: 'Lovely views, lots of steps.' }
  ],
  perPerson: { cabs: 450, food: 1500, cruise: 1200 },
  days: [
    { t: 'Arrive, lunch, beach by the stay', level: 1 },
    { t: 'Fort, market and a spice farm', level: 4, heavy: true },
    { t: 'South Goa beaches, free afternoon', level: 2 },
    { t: 'Old Goa churches, sunset river cruise', level: 3, cruise: true },
    { t: 'Slow breakfast, pack, head home', level: 1 },
    { t: 'Free day', level: 1 }, { t: 'Free day', level: 1 }
  ]
};
