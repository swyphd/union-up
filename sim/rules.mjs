import * as C from './core.mjs';
const { RULES, affinityMult, sharedAffinities } = C;

// Steeper on common ground than the shipped curve (0.7 + 0.35·shared, capped at 3).
const affSteep = (a, b) => 0.55 + 0.45 * Math.min(3, sharedAffinities(a, b).length);
// Flatter on standing: influence becomes a floor and a ceiling, not the main dial.
const weightFlat = (weight) => 0.75 + 0.45 * (weight / 100);

export const RULESETS = {
  // Exactly what the game ships: both systems multiply into every channel.
  current: { convoAff: affinityMult, publicAff: affinityMult, passiveAff: affinityMult,
             convoWeight: (w) => 0.45 + 0.85 * (w / 100) },
  // Minimal change: public actions ripple by standing alone.
  publicOnly: { convoAff: affinityMult, publicAff: () => 1, passiveAff: affinityMult,
                convoWeight: (w) => 0.45 + 0.85 * (w / 100) },
  // The full split: influence owns the broadcast channels, affinity owns the sit-down.
  split: { convoAff: affSteep, publicAff: () => 1, passiveAff: () => 1,
           convoWeight: weightFlat },
  // Same shape as `split`, with the broadcast channels scaled back up so total output
  // is held constant — separates the redesign from the 9% nerf it happens to carry.
  splitNeutral: { convoAff: affSteep, publicAff: () => 1.098, passiveAff: () => 1.098,
                  convoWeight: weightFlat },
};

export function applyRules(name, cal = {}) {
  const r = RULESETS[name];
  const k = cal[name] ?? 1;
  RULES.convoAff = (a, b) => r.convoAff(a, b) * k;
  RULES.publicAff = r.publicAff;
  RULES.passiveAff = r.passiveAff;
  RULES.convoWeight = r.convoWeight;
}
