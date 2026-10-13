// Play analytics, through the studio kit (src/kit/analytics.js): runs, how far they get,
// the choices worth comparing, and how they end, sent to the site's /api/events
// (Supabase game_events). Anonymous, and silent under Do Not Track or Global Privacy
// Control; see the kit for what it sends and what it never does.
//
// One run is one playthrough from the first week on the shop floor to the end of the
// company campaign. App starts, resumes and quits runs; the acts call `stats.milestone`
// and `stats.choice` from their handlers (never from effects, so a resumed act doesn't
// say it again) and `useRunEnd` for the endings they draw.
//
// Playtest skips mute it: a run that jumped ahead isn't a run anybody played.
import { useEffect, useRef } from "react";
import { createAnalytics } from "./kit/analytics.js";

// The commit Vercel built, or "dev" (vite.config.js defines it).
export const BUILD = typeof __BUILD__ !== "undefined" ? __BUILD__ : "dev";

let kit = null;
const live = () => {
  if (!kit) { try { kit = createAnalytics({ game: "union-up", version: BUILD }); } catch (e) { kit = null; } }
  return kit;
};
let muted = false;

// Every call is best-effort: analytics never throws into the game.
const call = (fn) => { if (muted) return undefined; try { const k = live(); return k ? fn(k) : undefined; } catch (e) { return undefined; } };

export const stats = {
  get run() { return kit ? kit.run : null; },
  get muted() { return muted; },
  mute(on) { muted = !!on; },
  runStart(props = {}, opts = {}) { return call(k => k.runStart(props, opts)); },
  runEnd(outcome, props = {}) { call(k => k.runEnd(outcome, props)); },
  milestone(name, props = {}) { call(k => k.milestone(name, props)); },
  choice(id, option, props = {}) { call(k => k.choice(id, option, props)); },
  progress(fn) { call(k => k.progress(fn)); },
  // For tests: swap in a fake analytics object.
  _use(fake) { kit = fake; muted = false; },
};

// Ends the run the first time `over` turns true while this act is on screen. An act that
// loads already over (a resumed save of a lost run) doesn't end it a second time.
export function useRunEnd(over, outcome, props) {
  const was = useRef(over);
  useEffect(() => {
    if (over && !was.current) stats.runEnd(outcome, props);
    was.current = over;
  }, [over]);
}
