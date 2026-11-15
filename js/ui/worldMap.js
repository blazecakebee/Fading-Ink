// World tab map: an OpenStreetMap snippet of your country with a pin on your city (© OpenStreetMap contributors).
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
