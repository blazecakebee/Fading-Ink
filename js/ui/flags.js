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
  // v0.9.16
  vn: S(`<rect width="30" height="20" fill="#da251d"/>${star(15, 10, 5.5, '#ffff00')}`),
  ph: S(`<rect width="30" height="10" fill="#0038a8"/><rect y="10" width="30" height="10" fill="#ce1126"/><polygon points="0,0 17.3,10 0,20" fill="#fff"/><circle cx="5.5" cy="10" r="2.2" fill="#fcd116"/>${star(1.8, 2.6, 1, '#fcd116')}${star(1.8, 17.4, 1, '#fcd116')}${star(13.8, 10, 1, '#fcd116')}`),
  id: S(`<rect width="30" height="10" fill="#ce1126"/><rect y="10" width="30" height="10" fill="#fff"/>`),
  th: S(`<rect width="30" height="20" fill="#a51931"/><rect y="3.33" width="30" height="13.34" fill="#f4f5f8"/><rect y="6.67" width="30" height="6.66" fill="#2d2a4a"/>`),
  pk: S(`<rect width="30" height="20" fill="#01411c"/><rect width="7.5" height="20" fill="#fff"/><circle cx="19" cy="10" r="5.2" fill="#fff"/><circle cx="20.6" cy="8.8" r="4.4" fill="#01411c"/>${star(22.4, 7.4, 1.6, '#fff')}`),
  bd: S(`<rect width="30" height="20" fill="#006a4e"/><circle cx="13.5" cy="10" r="6" fill="#f42a41"/>`),
  et: S(`<rect width="30" height="20" fill="#078930"/><rect y="6.67" width="30" height="13.33" fill="#fcdd09"/><rect y="13.33" width="30" height="6.67" fill="#da121a"/><circle cx="15" cy="10" r="5" fill="#0f47af"/>${star(15, 10.3, 3.3, '#fcdd09')}`),
  ke: S(`<rect width="30" height="20" fill="#fff"/><rect width="30" height="6" fill="#000"/><rect y="7.2" width="30" height="5.6" fill="#bb0000"/><rect y="14" width="30" height="6" fill="#006600"/><ellipse cx="15" cy="10" rx="3" ry="6.5" fill="#bb0000" stroke="#000" stroke-width=".6"/><path d="M15 3.6v12.8" stroke="#fff" stroke-width=".7"/>`),
  cd: S(`<rect width="30" height="20" fill="#007fff"/><path d="M0 20L30 0" stroke="#f7d618" stroke-width="7"/><path d="M0 20L30 0" stroke="#ce1021" stroke-width="5"/>${star(5.5, 5, 3, '#f7d618')}`),
  ht: S(`<rect width="30" height="10" fill="#00209f"/><rect y="10" width="30" height="10" fill="#d21034"/><rect x="11.5" y="7" width="7" height="6" fill="#fff"/><rect x="13.5" y="8.5" width="3" height="3" fill="#016a16"/>`),
  np: S(`<rect width="30" height="20" fill="none"/><polygon points="8,1 22,10.5 12,10.5 22,19 8,19" fill="#dc143c" stroke="#003893" stroke-width="1.4"/><circle cx="11.8" cy="7.6" r="1.6" fill="#fff"/><circle cx="11.8" cy="15.2" r="2" fill="#fff"/>`, '0 0 30 20'),
  ml: S(`<rect width="30" height="20" fill="#fcd116"/><rect width="10" height="20" fill="#14b53a"/><rect x="20" width="10" height="20" fill="#ce1126"/>`),
  de: S(`<rect width="30" height="20" fill="#ffce00"/><rect width="30" height="6.67" fill="#000"/><rect y="6.67" width="30" height="6.66" fill="#dd0000"/>`),
  ca: S(`<rect width="30" height="20" fill="#fff"/><rect width="7.5" height="20" fill="#d80621"/><rect x="22.5" width="7.5" height="20" fill="#d80621"/><path d="M15 4l1.2 2.4 1.8-.8-.6 3.4 2-1.6.6 1.4 1.6-.4-.8 2.6 1 .6-3.2 2.6.4 1.4-3-.4v2.6h-.4v-2.6l-3 .4.4-1.4-3.2-2.6 1-.6-.8-2.6 1.6.4.6-1.4 2 1.6-.6-3.4 1.8.8z" fill="#d80621"/>`),
  tr: S(`<rect width="30" height="20" fill="#e30a17"/><circle cx="11" cy="10" r="5" fill="#fff"/><circle cx="12.3" cy="10" r="4" fill="#e30a17"/>${star(17.3, 10, 2.2, '#fff')}`),
  za: S(`<rect width="30" height="20" fill="#fff"/><rect width="30" height="6.7" fill="#e03c31"/><rect y="13.3" width="30" height="6.7" fill="#001489"/><path d="M0 0L12.5 10L0 20M12.5 10H30" stroke="#fff" stroke-width="7" fill="none"/><path d="M0 0L12.5 10L0 20M12.5 10H30" stroke="#007749" stroke-width="4" fill="none"/><polygon points="0,2.8 9,10 0,17.2" fill="#ffb81c"/><polygon points="0,4.5 6.8,10 0,15.5" fill="#000"/>`),
  ar: S(`<rect width="30" height="20" fill="#74acdf"/><rect y="6.67" width="30" height="6.66" fill="#fff"/><circle cx="15" cy="10" r="2.2" fill="#f6b40e" stroke="#85340a" stroke-width=".3"/>`),
  co: S(`<rect width="30" height="20" fill="#ce1126"/><rect width="30" height="10" fill="#fcd116"/><rect y="10" width="30" height="5" fill="#003893"/>`),
};
export function flagEl(countryId, title = '') {
  const el = document.createElement('span'); el.className = 'flag-svg'; el.title = title;
  el.innerHTML = FLAGS[countryId] || ''; return el;
}
