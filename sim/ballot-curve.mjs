// Sweep the ballot curve once it runs on commitment rather than on the read.
// Win rate alone is not difficulty: a game that is won 60% of the time by 14 points is
// a cutscene. We want the margin to be narrow often enough that the last weeks matter.
import * as E from './engine.mjs';
import * as C from './core.mjs';
import { planWeek } from './policy.mjs';

// `useTrue` false reproduces what ships today, as the control row.
function runBallot(w, { useTrue, pivot, span }) {
  let yes = 0, no = 0, out = 0;
  w.forEach(x => {
    const v = useTrue ? (x.trueSupport ?? x.support) : x.support;
    const turnout = Math.min(0.96, 0.62 + 0.28 * Math.abs(v - 50) / 50 + (x.signed ? 0.06 : 0));
    if (Math.random() >= turnout) { out++; return; }
    const y = Math.min(0.93, Math.max(0.02, (v - pivot) / span + (x.signed ? 0.05 : 0)));
    if (Math.random() < y) yes++; else no++;
  });
  return { yes, no, out, cast: yes + no, won: yes > no };
}

export function play(cfg, opts = {}) {
  let G = E.newGame();
  for (let i = 0; i < 40; i++) {
    const signed = G.workers.filter(x => x.signed).length;
    if (G.stage === 'drive' && signed >= C.ACT1_CARDS_NEEDED + 1)
      G = { ...G, stage: 'campaign', filedWeek: G.week, electionWeek: G.week + C.ELECTION_WEEKS };
    const isElection = G.stage === 'campaign' && G.week >= G.electionWeek;
    G = E.resolveWeek(G, planWeek(G, { askBar: 74, pubPhase: 'campaign', ...opts }));
    if (isElection) return runBallot(G.workers, cfg);
  }
  return null;   // never filed: a loss, but not a ballot
}

const PLAYERS = {
  careful:  {},
  sloppy:   { blindDeep: true },
  careless: { blindDeep: true, askBar: 58 },
};

export function profile(cfg, N = 1500) {
  const out = {};
  for (const [name, opts] of Object.entries(PLAYERS)) {
    let won = 0, filed = 0, margins = [], close = 0, blowout = 0;
    for (let i = 0; i < N; i++) {
      const b = play(cfg, opts);
      if (!b) continue;
      filed++; if (b.won) won++;
      const m = Math.abs(b.yes - b.no);
      margins.push(m);
      if (m <= 2) close++; else if (m >= 8) blowout++;
    }
    margins.sort((a, b) => a - b);
    out[name] = {
      won: 100 * won / N, filed: 100 * filed / N,
      medMargin: margins[Math.floor(margins.length / 2)] ?? 0,
      close: 100 * close / (filed || 1), blowout: 100 * blowout / (filed || 1),
    };
  }
  return out;
}
