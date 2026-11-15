// World tab map: a tiled map of your country with a pin on your city. Tiles: CARTO basemaps (English/Latin labels),
// data © OpenStreetMap contributors, © CARTO.
const GEO = {
  cn: { bbox: [73, 18, 135, 54], cities: { Chongqing: [29.56, 106.55], Hangzhou: [30.27, 120.15], "Xi'an": [34.34, 108.94], Chengdu: [30.57, 104.07] } },
  kr: { bbox: [124.6, 33.1, 130.9, 38.9], cities: { Seoul: [37.57, 126.98], Busan: [35.18, 129.08], Incheon: [37.46, 126.71], Daegu: [35.87, 128.6] } },
  jp: { bbox: [128.5, 30.5, 146, 45.6], cities: { Tokyo: [35.68, 139.69], Osaka: [34.69, 135.5], Kyoto: [35.01, 135.77], Sapporo: [43.06, 141.35] } },
  us: { bbox: [-125, 24, -66, 50], cities: { 'New York': [40.71, -74.0], Chicago: [41.88, -87.63], 'Los Angeles': [34.05, -118.24], Houston: [29.76, -95.37] } },
  gb: { bbox: [-8.7, 49.8, 1.9, 59], cities: { London: [51.51, -0.13], Manchester: [53.48, -2.24], Leeds: [53.8, -1.55], Bristol: [51.45, -2.59] } },
  br: { bbox: [-74, -34, -34, 5.5], cities: { 'São Paulo': [-23.55, -46.63], 'Rio de Janeiro': [-22.91, -43.17], Salvador: [-12.97, -38.5], Recife: [-8.05, -34.9] } },
  ng: { bbox: [2.6, 4.2, 14.7, 13.9], cities: { Lagos: [6.52, 3.38], Abuja: [9.08, 7.4], Kano: [12.0, 8.52], Ibadan: [7.38, 3.95] } },
  in: { bbox: [68, 6.5, 97.5, 35.5], cities: { Mumbai: [19.08, 72.88], Delhi: [28.61, 77.21], Varanasi: [25.32, 83.01], Bengaluru: [12.97, 77.59] } },
  ru: { bbox: [27, 42, 95, 68], cities: { Moscow: [55.76, 37.62], 'Saint Petersburg': [59.93, 30.34], Kazan: [55.8, 49.11], Novosibirsk: [55.03, 82.92] } },
  mx: { bbox: [-117.5, 14.5, -86.5, 32.8], cities: { 'Mexico City': [19.43, -99.13], Guadalajara: [20.66, -103.35], Monterrey: [25.69, -100.32], Oaxaca: [17.07, -96.73] } },
  fr: { bbox: [-5.2, 42.3, 8.3, 51.1], cities: { Paris: [48.86, 2.35], Lyon: [45.76, 4.84], Marseille: [43.3, 5.37], Bordeaux: [44.84, -0.58] } },
  eg: { bbox: [24.7, 22, 36.9, 31.7], cities: { Cairo: [30.04, 31.24], Alexandria: [31.2, 29.92], Luxor: [25.69, 32.64], Giza: [30.01, 31.21] } },
};
export function mapUrl(countryId, city, zoomCity) {
  const g = GEO[countryId]; if (!g) return null; const pin = g.cities[city];
  let [w, s, e, n] = g.bbox;
  if (zoomCity && pin) { const d = 1.2; [w, s, e, n] = [pin[1] - d * 1.6, pin[0] - d, pin[1] + d * 1.6, pin[0] + d]; }
  return `https://www.openstreetmap.org/export/embed.html?bbox=${w},${s},${e},${n}&layer=mapnik${pin ? `&marker=${pin[0]},${pin[1]}` : ''}`;
}
export const osmLink = (countryId, city) => { const p = GEO[countryId]?.cities[city]; return p ? `https://www.openstreetmap.org/?mlat=${p[0]}&mlon=${p[1]}#map=6/${p[0]}/${p[1]}` : 'https://www.openstreetmap.org'; };

// Our own vector map: Natural Earth outlines (public domain), English labels, coloured by the current theme.
// Needs no map service or API key and works offline. The outline data is loaded only when the World tab opens.
const NS = 'http://www.w3.org/2000/svg';
const el = (t, a = {}) => { const e = document.createElementNS(NS, t); for (const [k, v] of Object.entries(a)) e.setAttribute(k, v); return e; };
const my = lat => -Math.log(Math.tan(Math.PI / 4 + Math.max(-85, Math.min(85, lat)) * Math.PI / 360)) * 180 / Math.PI; // mercator y in degree units
export function svgMap(countryId, countryName, city, zoomCity) {
  const wrap = document.createElement('div'); wrap.className = 'svg-map';
  const g = GEO[countryId]; if (!g) return wrap;
  import('../data/mapShapes.js').then(({ MAP_SHAPES }) => {
    const W = wrap.clientWidth || 900, H = wrap.clientHeight || 380, pin = g.cities[city];
    let [w, s, e, n] = g.bbox;
    if (zoomCity && pin) { const d = 2.2; [w, s, e, n] = [pin[1] - d * 1.5, pin[0] - d, pin[1] + d * 1.5, pin[0] + d]; }
    let x0 = w, x1 = e, y0 = my(n), y1 = my(s);
    const padX = (x1 - x0) * 0.06, padY = (y1 - y0) * 0.06; x0 -= padX; x1 += padX; y0 -= padY; y1 += padY;
    // grow the box to match the container's shape so nothing is stretched
    const want = W / H, have = (x1 - x0) / (y1 - y0);
    if (have < want) { const d = ((y1 - y0) * want - (x1 - x0)) / 2; x0 -= d; x1 += d; } else { const d = ((x1 - x0) / want - (y1 - y0)) / 2; y0 -= d; y1 += d; }
    const span = x1 - x0, fs = span / 55;
    const svg = el('svg', { viewBox: `${x0} ${y0} ${span} ${y1 - y0}`, preserveAspectRatio: 'xMidYMid meet', class: 'map-svg' });
    svg.append(el('rect', { x: x0, y: y0, width: span, height: y1 - y0, class: 'map-sea' }));
    for (const sh of MAP_SHAPES[countryId] || []) {
      const d = sh.rings.map(r => 'M' + r.map(([lon, lat]) => `${lon},${my(lat).toFixed(3)}`).join('L') + 'Z').join('');
      const path = el('path', { d, class: sh.home ? 'map-home' : 'map-land', 'stroke-width': span / 700, 'fill-rule': 'evenodd' });
      const t = el('title'); t.textContent = sh.name; path.append(t); svg.append(path);
    }
    if (!zoomCity) { const t = el('text', { x: (g.bbox[0] + g.bbox[2]) / 2, y: (my(g.bbox[1]) + my(g.bbox[3])) / 2, class: 'map-country', 'font-size': fs * 1.6, 'text-anchor': 'middle' }); t.textContent = countryName.toUpperCase(); svg.append(t); }
    for (const [name, [lat, lon]] of Object.entries(g.cities)) {
      const mine = name === city, x = lon, y = my(lat);
      svg.append(el('circle', { cx: x, cy: y, r: fs * (mine ? 0.45 : 0.3), class: mine ? 'map-city mine' : 'map-city' }));
      const t = el('text', { x: x + fs * 0.6, y: y + fs * 0.35, class: mine ? 'map-label mine' : 'map-label', 'font-size': fs * (mine ? 1.05 : 0.85) }); t.textContent = name; svg.append(t);
    }
    if (pin) { const x = pin[1], y = my(pin[0]), r = fs * 0.9;
      svg.append(el('path', { d: `M${x},${y} l${-r * 0.6},${-r * 1.3} a${r * 0.66},${r * 0.66} 0 1,1 ${r * 1.2},0 z`, class: 'map-pin-svg' })); }
    wrap.replaceChildren(svg);
  });
  return wrap;
}
