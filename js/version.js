// Game version + update log. When releasing an update: bump VERSION here AND in /version.json,
// and add a new entry at the TOP of CHANGELOG. Open games notice version.json changed and refresh.
export const VERSION = '0.2.1';
export const CHANGELOG = [
  { v: '0.2.1', date: '2026-11-15', title: 'Version tracking', notes: [
    'Version number shown in the top-right corner — click it to open the update log.',
    'New "Update Log" tab under Your Story.',
    'When a new version goes live, open games show a notice and refresh automatically (your life is saved first).',
    'Scrollbars now match your theme, and the side menu no longer scrolls sideways.',
  ] },
  { v: '0.2.0', date: '2026-11-15', title: 'Co-op', notes: [
    'Co-op rooms: host a room and share the 5-letter code, or join a friend\'s.',
    'Other players appear in your People tab: hang out, hit the gym, train Qi, spar, invite them to your sect or gang.',
    'Date, marry and have children with other players — the child exists in both lives, so either parent can continue as them.',
    'Room chat.',
  ] },
  { v: '0.1.0', date: '2026-11-15', title: 'First playable', notes: [
    'Yearly life loop with 4 Actions and 4 Social actions per year.',
    'Procedural anime-style pixel portraits that age with you and glow with cultivation.',
    '36 traits across 8 rarity tiers, from Common to God — some only earned through actions.',
    'School, careers, crime and prison, relationships, assets, investing, casino.',
    'Qi cultivation through 8 realms, meridians, sects and gangs, Heavenly Tribulations.',
    'Turn-based 1v1 combat, Dungeons & Gates with loot.',
    'Generational play and Legacy perks.',
    '14 themes, display and audio options, original generative music.',
  ] },
];
