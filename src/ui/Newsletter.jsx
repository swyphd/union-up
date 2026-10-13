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
  const done = status === "done";
  const busy = status === "busy";
  // A bot filled the honeypot: the kit says yes and sends nothing.
  const handleSubmit = (e) => submit(e, { website: hp });

  return (
    <div className="bg-stone-950 text-stone-200 font-mono px-6 pt-6">
      <div className="max-w-md mx-auto border border-stone-800 card-perf px-5 py-4">
        <div className="font-stencil text-xl text-amber-400 tracking-wide">GET THE NEXT GAME FIRST</div>
        {done ? (
          <p className="text-sm text-stone-400 mt-2">
            You're on the Permadeath Media list. New games and playtests, a few emails a year.
          </p>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <p className="text-sm text-stone-400 mt-2">
              New games, playtests and the occasional note from Permadeath Media. A few emails a year.
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
                {busy ? "SAVING…" : "SIGN UP"}
              </button>
            </div>
            {status === "error" && error && <p role="alert" className="text-xs text-red-400 mt-2">{error}</p>}
          </form>
        )}
      </div>
    </div>
  );
}
