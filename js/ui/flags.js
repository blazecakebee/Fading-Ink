// Small inline SVG flags (Windows can't show flag emoji). Simplified so they read well at ~20px.
const S = (body, vb = '0 0 30 20') => `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">${body}</svg>`;
const star = (cx, cy, r, fill) => { const p = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.42 : r; p.push(`${(cx + rr * Math.cos(a)).toFixed(2)},${(cy + rr * Math.sin(a)).toFixed(2)}`); } return `<polygon points="${p.join(' ')}" fill="${fill}"/>`; };
const FLAGS = {
  cn: S(`<rect width="30" height="20" fill="#de2910"/>${star(5, 5, 3, '#ffde00')}${star(10, 2, 1, '#ffde00')}${star(12, 4, 1, '#ffde00')}${star(12, 7, 1, '#ffde00')}${star(10, 9, 1, '#ffde00')}`),
  kr: S(`<rect width="30" height="20" fill="#fff"/><circle cx="15" cy="10" r="5" fill="#0047a0"/><path d="M10 10a5 5 0 0 1 10 0a2.5 2.5 0 0 1-5 0a2.5 2.5 0 0 0-5 0z" fill="#cd2e3a"/>
    <g fill="#000"><rect x="4" y="3" width="4" height="1" transform="rotate(-34 6 3.5)"/><rect x="4" y="4.6" width="4" height="1" transform="rotate(-34 6 5.1)"/><rect x="22" y="15" width="4" height="1" transform="rotate(-34 24 15.5)"/><rect x="22" y="13.4" width="4" height="1" transform="rotate(-34 24 13.9)"/>
    <rect x="22" y="3" width="4" height="1" transform="rotate(34 24 3.5)"/><rect x="22" y="4.6" width="4" height="1" transform="rotate(34 24 5.1)"/><rect x="4" y="15" width="4" height="1" transform="rotate(34 6 15.5)"/><rect x="4" y="13.4" width="4" height="1" transform="rotate(34 6 13.9)"/></g>`),
  jp: S(`<rect width="30" height="20" fill="#fff"/><circle cx="15" cy="10" r="6" fill="#bc002d"/>`),
  us: S(`<rect width="30" height="20" fill="#fff"/>${Array.from({ length: 7 }, (_, i) => `<rect y="${i * 20 / 6.5}" width="30" height="${20 / 13}" fill="#b22234"/>`).join('')}<rect width="13" height="10.8" fill="#3c3b6e"/>${Array.from({ length: 12 }, (_, i) => `<circle cx="${1.8 + (i % 4) * 3.1}" cy="${1.8 + Math.floor(i / 4) * 3.4}" r=".7" fill="#fff"/>`).join('')}`),
  gb: S(`<rect width="30" height="20" fill="#012169"/><path d="M0 0L30 20M30 0L0 20" stroke="#fff" stroke-width="4"/><path d="M0 0L30 20M30 0L0 20" stroke="#c8102e" stroke-width="1.6"/><path d="M15 0v20M0 10h30" stroke="#fff" stroke-width="6"/><path d="M15 0v20M0 10h30" stroke="#c8102e" stroke-width="3.4"/>`),
  br: S(`<rect width="30" height="20" fill="#009b3a"/><polygon points="15,2 28,10 15,18 2,10" fill="#fedf00"/><circle cx="15" cy="10" r="4.4" fill="#002776"/><path d="M10.8 9.2q4.2-1.4 8.4 1.2" stroke="#fff" stroke-width=".7" fill="none"/>`),
  ng: S(`<rect width="30" height="20" fill="#fff"/><rect width="10" height="20" fill="#008751"/><rect x="20" width="10" height="20" fill="#008751"/>`),
  in: S(`<rect width="30" height="20" fill="#fff"/><rect width="30" height="6.67" fill="#ff9933"/><rect y="13.33" width="30" height="6.67" fill="#138808"/><circle cx="15" cy="10" r="2.6" fill="none" stroke="#000080" stroke-width=".7"/><circle cx="15" cy="10" r=".6" fill="#000080"/>`),
  ru: S(`<rect width="30" height="20" fill="#fff"/><rect y="6.67" width="30" height="6.67" fill="#0039a6"/><rect y="13.33" width="30" height="6.67" fill="#d52b1e"/>`),
  mx: S(`<rect width="30" height="20" fill="#fff"/><rect width="10" height="20" fill="#006847"/><rect x="20" width="10" height="20" fill="#ce1126"/><ellipse cx="15" cy="10.3" rx="2.4" ry="2.1" fill="#8c5a2b"/><path d="M12.8 12.4q2.2 1.4 4.4 0" stroke="#006847" stroke-width=".7" fill="none"/>`),
  fr: S(`<rect width="30" height="20" fill="#fff"/><rect width="10" height="20" fill="#002395"/><rect x="20" width="10" height="20" fill="#ed2939"/>`),
  eg: S(`<rect width="30" height="20" fill="#fff"/><rect width="30" height="6.67" fill="#ce1126"/><rect y="13.33" width="30" height="6.67" fill="#000"/><path d="M13.6 8.2h2.8l-.5 3.4h-1.8z" fill="#c09300"/>`),
};
export function flagEl(countryId, title = '') {
  const el = document.createElement('span'); el.className = 'flag-svg'; el.title = title;
  el.innerHTML = FLAGS[countryId] || ''; return el;
}
