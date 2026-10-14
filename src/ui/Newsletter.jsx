// Mailing list signup, shown under every act. The site's /api/subscribe adds the
// address to Buttondown (which sends the welcome email) and keeps a backup row in
// Supabase; see the permadeath-media README.
import React, { useState } from "react";
import { useSignup } from "../kit/react.js";

// The kit's signup (src/kit/newsletter.js) posts to the site's /api/subscribe as the
// "union-up" source and remembers this browser under the key the game always used.
const SIGNUP_SOURCE = "union-up";
const SIGNUP_DONE_KEY = "union-up-newsletter";

export function NewsletterSignup() {
  const { email, setEmail, status, error, submit } = useSignup({ source: SIGNUP_SOURCE, doneKey: SIGNUP_DONE_KEY });
  const [hp, setHp] = useState("");
  const [joined, setJoined] = useState(""); // the address signed up just now, if any
  const done = status === "done";
  const busy = status === "busy";
  // A bot filled the honeypot: the kit says yes and sends nothing.
  const handleSubmit = (e) => {
    const addr = email.trim().toLowerCase();
    submit(e, { website: hp }).then(() => setJoined(addr));
  };

  return (
    <div className="bg-stone-950 text-stone-200 font-mono px-6 pt-6">
      <div className="max-w-md mx-auto border border-stone-800 card-perf px-5 py-4">
        <div className="font-stencil text-xl text-amber-400 tracking-wide">GET THE NEXT GAME FIRST</div>
        {done ? (
          <p role="status" className="text-sm text-stone-400 mt-2">
            {joined
              ? `You're on the list. Check ${joined} for a note from us; if it asks you to confirm, one click finishes it.`
              : "You're on the Permadeath Media list."}
          </p>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <p className="text-sm text-stone-400 mt-2">
              Early builds, a say in what we make next, and first word when we launch on Kickstarter
              or Patreon. A few emails a year. Unsubscribe anytime; we never sell or share your address.
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              <label htmlFor="newsletter-email" className="sr-only">Email address</label>
              <input
                id="newsletter-email" type="email" inputMode="email" autoComplete="email"
                placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required
                className="flex-1 min-w-0 bg-stone-900 border border-stone-700 focus:border-amber-400 focus:outline-none text-stone-100 text-sm px-3 py-2"
              />
              <input
                type="text" name="website" value={hp} onChange={e => setHp(e.target.value)}
                tabIndex={-1} autoComplete="off" aria-hidden="true"
                className="absolute -left-[9999px] w-px h-px opacity-0"
              />
              <button
                type="submit" disabled={busy}
                className="font-stencil text-base bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-stone-950 px-5 py-2 tracking-wide transition-colors"
              >
                {busy ? "SIGNING YOU UP…" : "GET EARLY BUILDS"}
              </button>
            </div>
            {status === "error" && error && <p role="alert" className="text-xs text-red-400 mt-2">{error}</p>}
          </form>
        )}
      </div>
    </div>
  );
}
