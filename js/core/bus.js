// Tiny hook table so game systems can talk to the UI without importing it (avoids circular imports).
// The UI fills these in at boot.
export const ui = {
  log: (text, cls) => {},          // add a line to this year's chronicle
  toast: (text, cls) => {},        // small corner notification
  fx: (kind, opts) => {},          // visual/audio feedback
  choice: async (opts) => null,    // modal with buttons -> resolves chosen value
  fight: async (enemy, opts) => 'win', // open combat screen -> 'win' | 'lose' | 'flee'
  refresh: () => {},
};
