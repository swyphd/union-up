// Union Up. One shop, then its first contract, then the rest of the company. Each act is
// its own component under src/ui; every number they run on lives under src/engine.
import React, { useState, useEffect } from "react";
import { GlobalStyle } from "./ui/shared.jsx";
import { NewsletterSignup } from "./ui/Newsletter.jsx";
import { ActOneGame } from "./ui/act1/ActOneGame.jsx";
import { ContractPrototype } from "./ui/contract/ContractPrototype.jsx";
import { ActTwoGame } from "./ui/company/ActTwoGame.jsx";
import { ACT1_SAVE_KEY, SAVE_VERSION } from "./save.js";

// =====================================================================================
// TOP-LEVEL WRAPPER — Act 1 (one shop) graduates into Act 2 (the citywide campaign)
// =====================================================================================

// v3 saves the whole floor and its friendships, because the first-contract act runs on
// them. A v2 save that already carries friendships loads as one. Any other v2 floor
// predates friendships and a v1 save is names only: neither carries the map the contract
// act needs, so both resume at the company campaign, which reads only the leaders' names
// and traits.

export default function PermadeathOrganizing() {
  // One shop, then its first contract, then the rest of the company. Each act hands the
  // next one the state it earned; nothing in the chain is rolled twice.
  const [act, setAct] = useState("loading"); // loading, choice, shop, contract, company
  const [act1, setAct1] = useState(null);       // { leaders, workers, influence, week }
  const [contract, setContract] = useState(null); // { leaders, tiers, max, ratified, survived }
  const [savedRun, setSavedRun] = useState(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(ACT1_SAVE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // A v2 save written since friendships arrived carries everything a v3 one does.
        const run = parsed && (parsed.v === SAVE_VERSION || (parsed.v === 2 && parsed.act1?.social))
          ? parsed
          // An older save: keep the names (and a contract result, if there was one) and
          // drop the floor, which cannot be bargained on without its friendships.
          : parsed && Array.isArray(parsed.act1?.leaders) ? { v: parsed.v, act1: { leaders: parsed.act1.leaders }, contract: parsed.contract || null }
          : parsed && Array.isArray(parsed.leaders) ? { v: 1, act1: { leaders: parsed.leaders }, contract: null }
          : null;
        if (run && run.act1 && Array.isArray(run.act1.leaders)) {
          setSavedRun(run);
          setAct("choice");
          return;
        }
      }
    } catch (e) {
      // no prior save, or storage unavailable — just start fresh
    }
    setAct("shop");
  }, []);

  function persist(next) {
    try {
      localStorage.setItem(ACT1_SAVE_KEY, JSON.stringify({ v: SAVE_VERSION, ...next }));
    } catch (e) {
      // persistence is a convenience, not a requirement — the run continues either way
    }
  }

  // Act One is done. The floor it built goes straight into the contract fight.
  function handleGraduate(payload, save = true) {
    // A playtest skip into the contract is never saved, not now and not when it ends.
    setAct1({ ...payload, playtest: !save });
    setContract(null);
    // The weight map is derived from the friendships; there is no reason to write it twice.
    if (save) persist({ act1: { ...payload, influence: undefined }, contract: null });
    setAct("contract");
  }

  // The contract fight is done. Whoever is left on the action team goes company-wide.
  function handleContractDone(result) {
    setContract(result);
    if (act1 && !act1.playtest) persist({ act1: { ...act1, influence: undefined }, contract: result });
    setAct("company");
  }

  function handleFullRestart() {
    setAct1(null);
    setContract(null);
    try { localStorage.removeItem(ACT1_SAVE_KEY); } catch (e) { /* nothing saved, or storage unavailable */ }
    setSavedRun(null);
    setAct("shop");
  }

  // Leaders reaching the company campaign come off the contract action team when there
  // was one, and off the Act One committee when the save predates the contract act.
  // A contract act that ended with nobody on the team sends nobody forward.
  const companyLeaders = contract ? (contract.leaders || []) : (act1?.leaders || []);

  let content;
  if (act === "loading") {
    content = <div className="min-h-screen bg-stone-950" />;
  } else if (act === "choice") {
    const hasContract = !!savedRun.contract;
    const hasFloor = Array.isArray(savedRun.act1?.workers) && !!savedRun.act1?.social;
    const names = (savedRun.contract ? (savedRun.contract.leaders || []) : savedRun.act1.leaders).map(l => l.name).join(", ");
    content = (
      <div className="min-h-screen bg-stone-950 text-stone-200 font-mono flex items-center justify-center px-6">
        <GlobalStyle />
        <div className="max-w-md text-center anim-rise">
          <div className="font-stencil text-4xl text-amber-400 mb-4">WELCOME BACK</div>
          <p className="text-stone-400 text-base leading-relaxed mb-6">
            {hasContract
              ? <>You organized the shop and bargained its first contract — <span className="text-stone-200 font-bold">{savedRun.contract.tiers} of {savedRun.contract.max}</span> tiers{savedRun.contract.ratified ? ", ratified" : ", never signed"}. {names ? <>{names} came through it with you.</> : "Nobody from the action team was left at the end of it."}</>
              : <>You've already organized this shop, with {savedRun.act1.leaders.length} leader{savedRun.act1.leaders.length === 1 ? "" : "s"} who stepped up: {names}.</>}
          </p>
          <button
            onClick={() => {
              setAct1(savedRun.act1);
              setContract(savedRun.contract || null);
              // A v1 save has no floor to bargain on, so it can only rejoin at the company.
              setAct(hasContract || !hasFloor ? "company" : "contract");
            }}
            className="font-stencil text-xl bg-amber-500 hover:bg-amber-400 text-stone-950 px-8 py-3 tracking-wide transition-colors block w-full mb-3"
          >
            {hasContract || !hasFloor ? "SKIP TO THE COMPANY CAMPAIGN" : "GO BARGAIN THE CONTRACT"}
          </button>
          {hasContract && hasFloor && (
            <button
              onClick={() => { setAct1(savedRun.act1); setContract(null); setAct("contract"); }}
              className="text-sm text-stone-500 hover:text-stone-300 underline block w-full mb-2"
            >
              Bargain that first contract again instead
            </button>
          )}
          <button onClick={handleFullRestart} className="text-sm text-stone-500 hover:text-stone-300 underline">
            Replay One Shop from the start instead
          </button>
        </div>
      </div>
    );
  } else if (act === "contract") {
    content = (
      <ContractPrototype
        carry={act1 && act1.workers ? { workers: act1.workers, social: act1.social || null, influence: act1.influence || null } : null}
        onComplete={handleContractDone}
        onExit={handleFullRestart}
      />
    );
  } else if (act === "shop") {
    content = (
      <ActOneGame
        onGraduate={handleGraduate}
        onSkipToCompany={() => { setContract(null); setAct("company"); }}
      />
    );
  } else {
    content = <ActTwoGame recruitedLeaders={companyLeaders} contract={contract} onFullRestart={handleFullRestart} />;
  }

  return (
    <div>
      {content}
      {act !== "loading" && <NewsletterSignup />}
      <div className="text-center text-sm text-stone-600 py-4">
        A <a href="https://permadeathmedia.com" target="_blank" rel="noopener noreferrer" className="hover:text-stone-400 transition-colors">Permadeath Studio</a> game
      </div>
    </div>
  );
}
