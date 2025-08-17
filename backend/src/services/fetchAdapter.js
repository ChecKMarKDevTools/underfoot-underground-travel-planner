// Fetch adapter placeholder. Replace `demoFetch` with an actual integration (n8n, DB, or HTTP).
export const demoFetch = (parsed, radiusMiles) => {
  const pool = [
    { name: 'Hidden Trail Overlook', blurb: 'Sunrise ridge locals love.', url: 'https://localblog.example/overlook', host: 'localblog.example', distanceMi: 6 },
    { name: 'Basement Bluegrass Night', blurb: 'Thursday pickers’ circle.', url: 'https://indiecalendar.example/bluegrass', host: 'indiecalendar.example', distanceMi: 2 },
    { name: 'Pop-up Hand Pie Window', blurb: 'Rotating flavors by the river.', url: 'https://substack.example/pies', host: 'substack.example', distanceMi: 12 },
    { name: 'Art Alley Micro-Gallery', blurb: 'Unmarked door, student shows.', url: 'https://campus.example/art', host: 'campus.example', distanceMi: 17 },
    { name: 'Coal Camp History Walk', blurb: 'Occasional docent strolls.', url: 'https://historyclub.example/walk', host: 'historyclub.example', distanceMi: 28 },
    { name: 'Creekside Night Market', blurb: 'DIY crafts and late bites.', url: 'https://indiecommunity.example/market', host: 'indiecommunity.example', distanceMi: 33 },
    { name: 'Old Rail Tunnel Echoes', blurb: 'Acoustic geek spot.', url: 'https://railnerds.example/echo', host: 'railnerds.example', distanceMi: 41 }
  ]
  return { items: pool.filter(x => x.distanceMi <= radiusMiles) }
}
