// One week of Act One, resolved. This is the whole turn loop, as a pure function of the
// campaign's state and the plan the player laid: nothing here reads or writes React.
//
// `state` is { workers, influence, week, stage, heat, consultant, perks, outsiders,
// electionWeek }. It returns the animation steps the board plays back, the `pending`
// state the component commits once the playback ends, and a small tally the sim reads.
// The component and the headless sim both call this, which is the point.
import { clamp, rand, random } from "../rng.js";
import { IDLE_GRACE, IDLE_QUIT, XP_PER_ACTION, XP_PER_CARD, committeeHours } from "./committee.js";
import { ACT1_ACTION, EDGE_MIN_DRAW, PUBLIC_TIERS, convoGain, misfireChance, publicGain, revealAffinities, revealCount, signChance } from "./actions.js";
import { AFFINITY_POOL, AFF_BY_ID, PERK_WEEKS, affList, poisonedAff, tieBonus, tieFrom, tieOn, visibleShared } from "./affinities.js";
import { infTrait, recvMult } from "./traits.js";
import { outgoingTies } from "./influence.js";
import { friendsOf, isKnownFriend, learnFriends, learnOneFriend, vouchFor } from "./friends.js";
import { FALLOUT_TUNING, RUMOR_REPAIR_WEEKS, breakFriendship, catchUp, cloneSocial, pickFallout, pickRumor, repairFriendship, seeCircle } from "./fallout.js";
import { COMMITTEE_TUNING, DROP_LEAK_TRUE, LEAK_TIP_TRUE, VET_MIN_XP, activeLeaks, committeeOf, leakChance, leakHeat, sizeHeat, sizeLeakChance } from "./coverage.js";
import { ACT1_WORKERS_SEED, ACT1_CARDS_NEEDED, ACT1_CARD_THRESHOLD, ACT1_HOURS_PER_ORGANIZER, ACT1_RECRUIT_REQ, ACT1_TOTAL_WORKERS, BURN_NARRATIVES, CARD_LIFESPAN, TEAM_LABEL } from "./constants.js";
import { CONSULTANT_FIRM, CONSULTANT_MAX_EACH, CONSULTANT_NAME, CONSULTANT_NAME_UC, CONSULTANT_ONE_ON_ONES, CONSULTANT_SETPIECE_GAP, CONSULTANT_TRIGGER_COMMITTEE, KIRKMAN_SIGHT, OUTSIDERS, holdsFast, orgChartResistance, signedBacking } from "./consultant.js";
import { rating, turnoutChance, voteProjection, yesChance } from "./election.js";

export function resolveWeek(state, planEntries) {
  const { workers, influence, week, stage, heat, consultant, perks, outsiders, electionWeek } = state;
  // This week's own copy of who is friends with whom: a falling out changes it, and the
  // changed copy is handed back with everything else.
  const social = cloneSocial(state.social);
  const organizers = workers.filter(x => x.organizer && !x.burned);
  const totalHours = organizers.reduce((s, o) => s + committeeHours(o), 0);
  const totalUsed = planEntries.reduce((s, e) => s + ACT1_ACTION[e.type].hours, 0);
  // What the week added up to, for the sim. The board reads the steps instead.
  const stats = { convoGain: 0, publicGain: 0, passiveGain: 0, misfires: 0, asks: 0, signs: 0, burns: 0 };
  const steps = [];
  let w = workers.map(x => ({ ...x }));
  const byId = (id) => w.find(x => x.id === id);
  let heatNext = heat;
  const touched = new Set();
  // What they say and what they'd do are separate numbers. Anything that doesn't ask
  // a person to DO something moves the first far more than the second — which is how
  // a campaign talks itself into believing it has the votes.
  // Every action an organizer runs makes them better at this. Successes count double.
  const gainXp = (actor, n) => { if (actor?.organizer) actor.experience = clamp((actor.experience || 0) + n, 0, 100); };
  const bump = (worker, amount, trueAmount = null) => {
    worker.support = clamp(worker.support + amount);
    const real = trueAmount === null ? Math.round(amount * 0.3) : trueAmount;
    worker.trueSupport = clamp((worker.trueSupport ?? worker.support) + real);
    touched.add(worker.id);
  };

  steps.push({ label: "WEEK START", sub: `${organizers.length} organizer${organizers.length === 1 ? "" : "s"} on the floor, ${totalUsed} of ${totalHours} hours committed.`, workers: w.map(x => ({ ...x })), lines: [] });

  // --- THE LEAK ---
  // Every undetected leak on the committee tells a manager about one thing the committee
  // has planned this week, a card ask if there is one, else a sit-down. Somebody gets to
  // that person first. It is the only sign a leak gives, and the player sees it land.
  const tipped = new Set();
  const tipLines = [];
  activeLeaks(w).forEach(leak => {
    const pool = planEntries.filter(e => e.targetId != null && e.targetId !== leak.id && !tipped.has(e.targetId));
    const asks = pool.filter(e => e.type === "ask"), sits = pool.filter(e => e.type === "deep");
    const pick = asks.length ? asks[rand(asks.length)] : sits.length ? sits[rand(sits.length)] : null;
    if (!pick) return;
    const t = byId(pick.targetId);
    if (!t || t.burned) return;
    tipped.add(t.id);
    t.tippedWeek = week;
    t.trueSupport = clamp((t.trueSupport ?? t.support) - LEAK_TIP_TRUE);
    stats.tipped = (stats.tipped || 0) + 1;
    tipLines.push(`${t.name} had a quiet word from a manager the day before anybody from the committee got to them. Somebody knew it was coming.`);
  });
  if (tipLines.length) steps.push({ label: "SOMEBODY KNEW", sub: "Management got there first.", workers: w.map(x => ({ ...x })), lines: tipLines });

  // --- CONVERSATIONS ---
  const convoLines = [];
  const convoPulses = [];
  const convoNotes = {};
  planEntries.filter(e => e.type === "quick" || e.type === "deep").forEach(e => {
    const actor = byId(e.actorId);
    const target = byId(e.targetId);
    if (!actor || !target || actor.burned || target.burned) return;
    const tie = tieOn(influence, actor, target, w);
    const g = convoGain(actor, target, tie);
    const before = target.support;
    target.revealed = true; // you learn who they listen to by sitting down with them
    target.spokenTo = true; // and you learn something about where they actually are
    // The map. A quick chat gets one name and whether they run in the same crowd as
    // whoever is asking; the long version gets all of it (below, once it lands).
    const mentioned = learnOneFriend(w, social, target.id);
    if (social.circleOf?.[target.id] && social.circleOf[target.id] === social.circleOf[actor.id]) seeCircle(target, social);
    // Any conversation brings you up to date on who they still talk to.
    const goneQuiet = catchUp(w, social, target);
    let mapNews = goneQuiet.length ? ` ${target.name} and ${goneQuiet.map(y => y.name).join(" and ")} don't talk anymore.` : "";
    // A rumor can be talked down while it is fresh.
    social.rumors.filter(r => week - r.week <= RUMOR_REPAIR_WEEKS && (r.a === target.id || r.b === target.id)).forEach(r => {
      const other = byId(r.a === target.id ? r.b : r.a);
      if (other && repairFriendship(w, social, target, other, week)) {
        r.repaired = true;
        stats.repairs = (stats.repairs || 0) + 1;
        mapNews += ` ${actor.name} gets the story straight: ${target.name} and ${other.name} are talking again.`;
      }
    });
    social.rumors = social.rumors.filter(r => !r.repaired);
    const friendNote = (mentioned != null ? ` They mention ${byId(mentioned)?.name}.` : "") + mapNews;

    // Surface what they have in common. This is the payload of the quick chat.
    const found = revealAffinities(target, revealCount(e.type, actor, target));
    const foundNames = found.map(t => AFF_BY_ID[t].label.toLowerCase());

    if (e.type === "deep" && random() < misfireChance(actor, target, w)) {
      // Cold deep talk. They hear a pitch, not a conversation.
      target.guarded = 3;
      stats.misfires++;
      gainXp(actor, 3); // you learn something even from a conversation that goes badly
      bump(target, -2, -4);
      convoPulses.push({ from: actor.id, to: target.id, tone: "down" });
      convoNotes[target.id] = `${actor.name} misreads them`;
      convoLines.push(`${target.name}: ${actor.name} sat down for the long version without knowing the first thing about them. It landed like a sales pitch — ${target.name} is guarded now, and will be for a while.${foundNames.length ? ` You did at least learn something: ${foundNames.join(", ")}.` : ""}${friendNote}`);
      target.history.push(`Week ${week}: a cold deep conversation with ${actor.name} backfired.`);
      return;
    }

    // The sit-down is also the only thing that tells you the truth about them.
    if (e.type === "deep") { target.trueKnown = true; target.trueKnownWeek = week; }
    gainXp(actor, e.type === "deep" ? XP_PER_ACTION : Math.round(XP_PER_ACTION * 0.6));
    // Somebody got to them first: the long version lands at half strength.
    const primed = tipped.has(target.id) ? 0.5 : 1;
    const trueGain = Math.round((e.type === "deep" ? g.deepTrue : g.quickTrue) * primed);
    bump(target, Math.round((e.type === "deep" ? g.deep : g.quick) * primed), trueGain);
    stats.convoGain += target.support - before;
    let deepMap = "";
    if (e.type === "deep") {
      target.trueReadValue = target.trueSupport;
      // Everyone they are close to, which crowd they are part of, and their read on each
      // friend: words again, a ceiling, but it puts a digit on people nobody has met.
      const newly = learnFriends(w, social, target.id);
      seeCircle(target, social);
      const heardOf = [];
      friendsOf(social, target.id).forEach(fid => {
        const f = byId(fid);
        if (f && !f.spokenTo && !f.trueKnown && !f.signed && !f.heardAbout) { f.heardAbout = true; heardOf.push(f.name); }
      });
      const names = friendsOf(social, target.id).map(fid => byId(fid)?.name).filter(Boolean);
      deepMap = names.length
        ? ` Close with ${names.join(", ")}${heardOf.length ? `, and you hear how ${heardOf.length === 1 ? heardOf[0] + " is" : "they are"} doing` : ""}.`
        : " Keeps to themselves.";
      if (newly === 0 && !heardOf.length && names.length) deepMap = "";
    }
    if (target.guarded > 0 && e.type === "deep" && visibleShared(actor, target).length) target.guarded = 0;
    convoPulses.push({ from: actor.id, to: target.id, tone: "up" });
    // Only common ground you have SURFACED does any work, so only that is worth
    // narrating — otherwise the line would credit a connection the tie never got.
    const shared = tieBonus(actor, target);
    const flavor = shared >= 2
      ? `they find real common ground fast`
      : shared === 1
        ? `${actor.name} finds a way in`
        : tie >= 55
          ? `${actor.name} has standing, but nothing to build on`
          : `${actor.name} can't find a thread to pull`;
    convoNotes[target.id] = shared >= 2 ? `${actor.name} connects` : shared === 1 ? `${actor.name} gets heard` : `${actor.name} bounces off`;
    // A deep conversation's real payload is not the support it moves, it is that you
    // now know something. Lead with that, because that is what the player just bought.
    convoLines.push(
      e.type === "deep"
        ? `${target.name}: a long, honest conversation with ${actor.name} — ${flavor}. You now know where ${target.name} actually stands: a ${rating(target.trueSupport)}${rating(target.trueSupport) < rating(target.support) ? `, against the ${rating(target.support)} they talk like` : ", and they talk like it"}. That read is good for a few weeks before people move again.${deepMap}${foundNames.length ? ` You also learn: ${foundNames.join(", ")}.` : ""}`
        : `${target.name}: a quick word with ${actor.name} — ${flavor}. They talk ${rating(target.support) > rating(before) ? `warmer, like a ${rating(target.support)} now` : "warmer"}, which is a ceiling and not a read.${friendNote}${foundNames.length ? ` You learn: ${foundNames.join(", ")}.` : ""}`
    );
    target.history.push(`Week ${week}: ${ACT1_ACTION[e.type].label.toLowerCase()} with ${actor.name}.`);
  });
  if (convoLines.length) steps.push({ label: "ONE-ON-ONES", sub: "Influence is relationship-specific — the same conversation lands differently depending on who has it.", workers: w.map(x => ({ ...x })), lines: convoLines, edgePulses: convoPulses, notes: convoNotes });

  // --- PUBLIC ACTIONS ---
  const publicLines = [];
  const publicPulses = [];
  const publicNotes = {};
  planEntries.filter(e => PUBLIC_TIERS[e.type]).forEach(e => {
    const actor = byId(e.actorId);
    if (!actor || actor.burned) return;
    const tier = PUBLIC_TIERS[e.type];
    const uses = actor.publicUses?.[e.type] || 0;
    actor.publicUses = { ...actor.publicUses, [e.type]: uses + 1 };
    actor.support = clamp(actor.support + tier.selfSupport);
    heatNext = clamp(heatNext + Math.round(tier.heat * (infTrait(actor).publicHeat || 1)));
    // Reach is measured on the tie, so common ground you have surfaced can pull a
    // relationship over the line and put somebody inside this person's reach who
    // wasn't there last week.
    const reached = outgoingTies(influence, actor.id).map(t => {
      const target = byId(t.id);
      return target && !target.burned ? { ...t, target, tie: tieFrom(t.weight, actor, target) } : null;
    }).filter(t => t && t.tie >= EDGE_MIN_DRAW);
    let moved = 0;
    reached.forEach(t => {
      const target = t.target;
      const gain = publicGain(actor, target, t.tie, e.type, uses);
      if (gain <= 0) return;
      // Visibility is not commitment. Watching a coworker go public makes people say
      // warmer things; it barely moves what they'd sign.
      bump(target, gain, Math.round(gain * 0.15));
      stats.publicGain += gain;
      moved++;
      publicPulses.push({ from: actor.id, to: t.id, tone: "up" });
    });
    publicNotes[actor.id] = e.type === "large" ? "goes public, loudly" : e.type === "medium" ? "puts their name on it" : "wears the button";
    publicLines.push(`${actor.name} ${tier.blurb} ${moved > 0 ? `${moved} coworker${moved === 1 ? "" : "s"} who take cues from ${actor.name} move${uses > 0 ? " — though this isn't news anymore" : ""}.` : "Nobody who takes cues from them notices."}`);
    gainXp(actor, XP_PER_ACTION);
    actor.history.push(`Week ${week}: took a ${e.type} public action.`);

    if (tier.burn > 0) {
      const lastOne = w.filter(x => x.organizer && !x.burned).length <= 1;
      // HOTHEADs are the ones who get walked out. The CAUTIOUS almost never are.
      const risk = tier.burn * (0.6 + heatNext / 100) * (infTrait(actor).burnMult ?? 1);
      if (random() < risk) {
        if (lastOne) {
          heatNext = clamp(heatNext + 8);
          publicLines.push(`${actor.name} gets pulled aside about "tone" the next morning. It's a warning shot — and they're the only organizer left, so they take it and keep going.`);
          actor.shaken = 1;
        } else {
          actor.burned = true;
          actor.organizer = false;
          stats.burns++;
          const narrative = BURN_NARRATIVES[rand(BURN_NARRATIVES.length)](actor.name);
          publicNotes[actor.id] = "pulled out of play";
          publicLines.push(`${narrative} ${actor.name} is out of the campaign — the card they signed still counts, but their hours and their reach don't.`);
          actor.history.push(`Week ${week}: exposed after a big public action — out of play.`);
          outgoingTies(influence, actor.id).forEach(t => {
            const target = byId(t.id);
            if (!target || target.burned) return;
            const hit = Math.round((t.weight / 100) * 9);
            if (hit <= 0) return;
            bump(target, -hit);
            publicPulses.push({ from: actor.id, to: t.id, tone: "down" });
          });
          heatNext = clamp(heatNext + 6);
        }
      }
    }
  });
  if (publicLines.length) steps.push({ label: "PUBLIC ACTIONS", sub: "What your people are seen doing travels down every line they carry.", workers: w.map(x => ({ ...x })), lines: publicLines, edgePulses: publicPulses, notes: publicNotes });

  // --- CARD ASKS ---
  const askLines = [];
  const askPulses = [];
  const askNotes = {};
  planEntries.filter(e => e.type === "ask").forEach(e => {
    const actor = byId(e.actorId);
    const target = byId(e.targetId);
    if (!actor || !target || actor.burned || target.burned || target.signed) return;
    const tie = tieOn(influence, actor, target, w);
    const chance = signChance(actor, target, tie) * (tipped.has(target.id) ? COMMITTEE_TUNING.tipAsk : 1);
    target.revealed = true;
    touched.add(target.id);
    stats.asks++;
    if (random() < chance) {
      target.signed = true;
      stats.signs++;
      target.signedWeek = week;
      target.support = Math.max(target.support, 78);
      target.trueSupport = clamp(Math.max(target.trueSupport ?? 0, 72));
      gainXp(actor, XP_PER_CARD);
      heatNext = clamp(heatNext + 4);
      askNotes[target.id] = "SIGNS THE CARD";
      askLines.push(`${target.name} signs. ${actor.name} asked, and the answer was yes.`);
      target.history.push(`Week ${week}: signed a union card after ${actor.name} asked.`);
      outgoingTies(influence, target.id).forEach(t => {
        const other = byId(t.id);
        if (!other || other.burned || other.signed) return;
        bump(other, Math.round((t.weight / 100) * 4));
        askPulses.push({ from: target.id, to: t.id, tone: "up" });
      });
    } else {
      gainXp(actor, 4); // a no still teaches you something about the room
      const before = target.support;
      target.support = clamp(target.support - 5);
      target.askedRecently = 2;
      askNotes[target.id] = target.support < 45 ? "not even close" : "not yet";
      askLines.push(
        target.support < 45
          ? `${target.name} isn't there. Being asked before they were ready made it worse.`
          : `${target.name} says they're with you — just not ready to put their name on paper yet.`
      );
      target.history.push(`Week ${week}: ${actor.name} asked for a card. Not yet.`);
    }
  });
  if (askLines.length) steps.push({ label: "THE ASK", sub: "Support isn't a signature. This is where you find out the difference.", workers: w.map(x => ({ ...x })), lines: askLines, edgePulses: askPulses, notes: askNotes });

  // --- COMMITTEE GROWTH ---
  const recruitLines = [];
  const recruitNotes = {};
  const recruitReveal = (newMember) => {
    // A committee member reports honestly on the people they actually know. This is
    // the Act One version of the shop committee's true-support read in Act Two.
    newMember.trueKnown = true;
    newMember.trueKnownWeek = week;
    newMember.trueReadValue = newMember.trueSupport;
    outgoingTies(influence, newMember.id).filter(t => t.weight >= 40).forEach(t => {
      const target = byId(t.id);
      if (target) { target.trueKnown = true; target.trueKnownWeek = week; target.trueReadValue = target.trueSupport; }
    });
  };
  planEntries.filter(e => e.type === "recruit").forEach(e => {
    const actor = byId(e.actorId);
    const target = byId(e.targetId);
    if (!actor || !target || actor.burned || target.burned || target.organizer || !target.signed) return;
    // The ask has to come from somebody they will hear it from: a friend, or somebody
    // a signed friend in common can vouch for.
    if (!isKnownFriend(actor, target.id) && !vouchFor(actor, target, w)) return;
    // The judgment. Whether they will repeat things is settled the week they join, by
    // where they really stand, and nobody is told.
    target.leak = random() < leakChance(target.trueSupport);
    if (target.leak) stats.leaksJoined = (stats.leaksJoined || 0) + 1;
    target.vettedWeek = null;
    target.organizer = true;
    target.revealed = true;
    target.weeksIdle = 0;
    target.signedWeek = week; // joining the committee is itself a fresh commitment
    gainXp(actor, XP_PER_ACTION);
    target.knownAffinities = [...affList(target)]; // your own people hold nothing back
    seeCircle(target, social);
    catchUp(w, social, target);
    learnFriends(w, social, target.id);
    recruitReveal(target);
    recruitNotes[target.id] = "joins the committee";
    recruitLines.push(`${target.name} joins the organizing committee. That's ${ACT1_HOURS_PER_ORGANIZER} more hours on the floor every week, a whole set of relationships you couldn't reach before — and an honest read on where the people they know actually stand.`);
    target.history.push(`Week ${week}: joined the organizing committee.`);
  });
  if (recruitLines.length) steps.push({ label: "THE COMMITTEE GROWS", sub: "Every person you bring on is more time and more reach.", workers: w.map(x => ({ ...x })), lines: recruitLines, notes: recruitNotes });

  // --- CHECK-INS: organizers looking after each other ---
  // The answer to forgetting the people who already signed. One hour of somebody's
  // week spent on a teammate instead of a target: resets their clock, builds them up,
  // and pulls them out from under a manager's eye.
  const checkinLines = [];
  const checkinNotes = {};
  const checkinPulses = [];
  planEntries.filter(e => e.type === "checkin").forEach(e => {
    const actor = byId(e.actorId);
    const target = byId(e.targetId);
    if (!actor || !target || actor.burned || target.burned || !target.organizer) return;
    const wasIdle = target.weeksIdle || 0;
    const wasShaken = target.shaken > 0;
    target.weeksIdle = 0;
    target.shaken = 0;
    gainXp(target, 10);
    gainXp(actor, 4);
    target.trueSupport = clamp((target.trueSupport ?? target.support) + 3);
    touched.add(target.id);
    checkinPulses.push({ from: actor.id, to: target.id, tone: "up" });
    // Somebody who has done this a while can tell when a colleague has been talking.
    const canVet = (actor.experience || 0) >= VET_MIN_XP;
    let vetLine = "";
    if (canVet) {
      target.vettedWeek = week;
      if (target.leak) {
        target.leakKnown = true;
        vetLine = `${actor.name} comes away sure of it: ${target.name} has been repeating committee business to a manager. `;
      } else vetLine = `${actor.name} comes away sure of ${target.name}. `;
    }
    checkinNotes[target.id] = target.leakKnown && canVet ? `${target.name} has been talking` : `${actor.name} checks in`;
    checkinLines.push(
      `${actor.name} spends an hour on ${target.name} instead of a target — coffee, no agenda. ` +
      (wasShaken ? `It gets ${target.name} out from under the manager's eye. ` : "") +
      (wasIdle >= IDLE_GRACE ? `${target.name} had been drifting for ${wasIdle} weeks; they're back in it. ` : "") +
      vetLine
    );
  });
  // Taking somebody off the committee. A leak shown the door is soured for good; anyone
  // else steps back the way a neglected member does.
  planEntries.filter(e => e.type === "drop").forEach(e => {
    const actor = byId(e.actorId);
    const target = byId(e.targetId);
    if (!actor || !target || actor.burned || target.burned || !target.organizer || actor.id === target.id) return;
    target.organizer = false;
    target.weeksIdle = 0;
    if (target.leak) {
      stats.leaksDropped = (stats.leaksDropped || 0) + 1;
      target.trueSupport = Math.min(target.trueSupport ?? 0, DROP_LEAK_TRUE);
      target.support = Math.min(target.support, DROP_LEAK_TRUE + 10);
      checkinLines.push(`${actor.name} tells ${target.name} they are off the committee. ${target.name} knows why. Whatever reached the manager's office from here, nothing more will.`);
    } else {
      target.trueSupport = clamp((target.trueSupport ?? target.support) - 12);
      target.experience = Math.round((target.experience || 0) * 0.6);
      checkinLines.push(`${actor.name} asks ${target.name} to step back from the committee. ${target.name} takes it the way anybody would.`);
    }
    target.leak = false;
    target.leakKnown = false;
    checkinNotes[target.id] = "off the committee";
    target.history.push(`Week ${week}: taken off the committee.`);
  });
  if (checkinLines.length) steps.push({ label: "LOOKING AFTER EACH OTHER", sub: "An hour spent on your own people is not an hour wasted.", workers: w.map(x => ({ ...x })), lines: checkinLines, notes: checkinNotes, edgePulses: checkinPulses });

  // --- THE FLOOR TALKS: signed workers keep working on the people they move, for free ---
  const passiveLines = [];
  const passivePulses = [];
  w.filter(x => x.signed && !x.burned).forEach(signer => {
    outgoingTies(influence, signer.id).forEach(t => {
      if (t.weight < 50) return;
      const target = byId(t.id);
      if (!target || target.burned || target.signed) return;
      const gain = Math.max(1, Math.round((tieFrom(t.weight, signer, target) / 100) * 2 * (infTrait(signer).passive || 1) * recvMult(target)));
      bump(target, gain);
      stats.passiveGain += gain;
      passivePulses.push({ from: signer.id, to: t.id, tone: "up" });
    });
  });
  // Committee neglect. Two weeks of grace, then their hours start shrinking, then
  // they step back off entirely. Nothing here resets — re-recruiting costs the full
  // three hours again, against a person whose commitment has already slipped.
  const quitLines = [];
  const quitNotes = {};
  w.forEach(x => {
    if (!x.organizer || x.burned) return;
    const usedThisWeek = planEntries.some(e => e.actorId === x.id) || planEntries.some(e => e.type === "checkin" && e.targetId === x.id);
    x.weeksIdle = usedThisWeek ? 0 : (x.weeksIdle || 0) + 1;
    if (x.weeksIdle >= IDLE_QUIT) {
      x.organizer = false;
      x.leak = false;
      x.leakKnown = false;
      x.weeksIdle = 0;
      x.experience = Math.round((x.experience || 0) * 0.6);
      x.trueSupport = clamp((x.trueSupport ?? x.support) - 12);
      quitNotes[x.id] = "steps off the committee";
      quitLines.push(`${x.name} stops showing up. Nobody has asked them to do anything in ${IDLE_QUIT} weeks, and they got the message that they weren't needed. Their hours are gone, and getting them back means starting the ask over.`);
    } else if (x.weeksIdle === IDLE_GRACE + 1) {
      quitLines.push(`${x.name} has been sitting idle. They're down to ${committeeHours(x)} hour${committeeHours(x) === 1 ? "" : "s"} a week \u2014 people disengage when the campaign stops needing them.`);
    }
  });
  if (quitLines.length) steps.push({ label: "THE COMMITTEE", sub: "A committee is a set of relationships, not a list of names.", workers: w.map(x => ({ ...x })), lines: quitLines, notes: quitNotes });

  w.forEach(x => {
    if (x.askedRecently > 0) x.askedRecently -= 1;
    if (x.guarded > 0) x.guarded -= 1;
    if (x.shaken > 0) x.shaken -= 1;
    if (x.underPressure > 0) x.underPressure -= 1;
    if (x.signed || x.burned) { x.quietWeeks = 0; return; }
    x.quietWeeks = touched.has(x.id) ? 0 : x.quietWeeks + 1;
    if (x.quietWeeks >= 3 && x.support > 25) {
      x.support = clamp(x.support - 2);
      x.trueSupport = clamp((x.trueSupport ?? x.support) - 3);
      x.quietWeeks = 0;
      passiveLines.push(`${x.name} hasn't heard from anybody in weeks. Whatever was building quietly drains back out.`);
    }
  });
  if (passivePulses.length) {
    passiveLines.unshift("Everyone who's signed keeps working on the people they carry weight with — no hours spent.");
  }
  if (passiveLines.length) steps.push({ label: "THE FLOOR TALKS", sub: "The campaign runs on its own between your hours — in both directions.", workers: w.map(x => ({ ...x })), lines: passiveLines, edgePulses: passivePulses });



  // --- CARDS GO STALE ---
  // Nothing resets. A signature that rots costs you the card, the true support behind
  // it, and makes the re-ask harder than the first ask was.
  const staleLines = [];
  const staleNotes = {};
  w.forEach(x => {
    if (!x.signed || x.burned || x.signedWeek == null) return;
    if (week - x.signedWeek < CARD_LIFESPAN) return;
    x.signed = false;
    x.signedWeek = null;
    x.staleCount = (x.staleCount || 0) + 1;
    x.askedRecently = 2;
    x.support = clamp(x.support - 6);
    x.trueSupport = clamp((x.trueSupport ?? x.support) - 10);
    staleNotes[x.id] = "CARD GOES STALE";
    if (x.organizer) {
      // A committee member's card lapsing is worse: they've been carrying this for
      // over three months with nothing to show anyone.
      x.experience = Math.round((x.experience || 0) * 0.85);
      staleLines.push(`${x.name} signed ${CARD_LIFESPAN} weeks ago and has been organizing on that card ever since. It's too old to count now. They re-sign without being asked \u2014 but something goes out of them, and it comes off where it counts, not off what they say.`);
      x.signed = true;
      x.signedWeek = week;
    } else {
      staleLines.push(`${x.name}'s card is ${CARD_LIFESPAN} weeks old. The board won't accept it as evidence of what they think today, and honestly, neither should you. \u22126 off what they'll say and \u221210 off where they actually are, and the second ask is harder than the first was.`);
    }
    x.history.push(`Week ${week}: card went stale after ${CARD_LIFESPAN} weeks.`);
  });
  if (staleLines.length) steps.push({ label: "CARDS GO STALE", sub: "A signature is evidence of what somebody thought on the day they signed it.", workers: w.map(x => ({ ...x })), lines: staleLines, notes: staleNotes });

  // --- THE OUTSIDER LADDER ---
  // Every rung is a response to the campaign working. None of them un-arrive.
  let outsidersNext = [...outsiders];
  const ladderLines = [];
  const ladderNotes = {};
  {
    const ctx = {
      committee: w.filter(x => x.organizer && !x.burned).length,
      signed: w.filter(x => x.signed).length,
      heat: heatNext,
      stage,
    };
    OUTSIDERS.forEach(o => {
      if (outsidersNext.includes(o.id)) return;
      if (o.id === "consultant") return; // handled by the consultant block itself
      if (!o.arrival(ctx)) return;
      outsidersNext.push(o.id);
      ladderLines.push(`${o.name} ARRIVES \u2014 ${o.role}. ${o.intro(o.name)}`);
    });

    // DANIELS, the studio head. He is genuinely liked, and that is the weapon: he
    // moves what people SAY by a lot and what they'd DO by almost nothing. Playing
    // him well means the morale number lies to you worse than it already did.
    if (outsidersNext.includes("boss") && random() < 0.5) {
      let moved = 0, stated = 0;
      w.forEach(x => {
        if (x.burned || x.organizer) return;
        const up = 4 + rand(4);
        x.support = clamp(x.support + up);
        x.trueSupport = clamp((x.trueSupport ?? x.support) - 2);
        stated += up; moved += 1;
      });
      ladderLines.push(
        `DANIELS WORKS THE FLOOR \u2014 ${moved} people: +${moved ? Math.round(stated / moved) : 0} each to what they'll tell you, \u22122 to where they stand. ` +
        `He is warm, he is specific, and he means it. Nobody changes their mind about the union. Everybody sounds friendlier about the company, which is worse: the morale number is now further from the vote than it has ever been.`
      );
    }

    // VANTAGE PARTNERS. Ownership does not persuade. It threatens the whole studio,
    // which raises fulfillment-as-risk across the board — everyone has more to lose.
    if (outsidersNext.includes("corporate") && random() < 0.45) {
      const teams = ["engineering", "qa", "production"];
      const t = teams[rand(teams.length)];
      let n = 0;
      w.forEach(x => {
        if (x.burned || x.team !== t) return;
        x.fulfillment = clamp(x.fulfillment + 6);
        x.trueSupport = clamp((x.trueSupport ?? x.support) - 4);
        n += 1;
      });
      heatNext = clamp(heatNext + 5);
      ladderLines.push(
        `VANTAGE PARTNERS REVIEWS ${TEAM_LABEL[t]} \u2014 ${n} people: +6 what-they'd-be-risking, \u22124 where they stand. ` +
        `A slide deck nobody was supposed to see puts a question mark next to the department. No threat is made. None needs to be.`
      );
    }

    // THE PODCAST. Fires at everyone, ignores the social map entirely, and lands
    // backwards on the people who resent being told what to think.
    if (outsidersNext.includes("celebrity") && random() < 0.4) {
      let hit = 0, backfired = 0;
      w.forEach(x => {
        if (x.burned) return;
        const t = infTrait(x);
        if (t.holdsFast || t.id === "hothead") {
          x.support = clamp(x.support + 6);
          x.trueSupport = clamp((x.trueSupport ?? x.support) + 5);
          backfired += 1;
        } else {
          x.support = clamp(x.support - 3);
          x.trueSupport = clamp((x.trueSupport ?? x.support) - 2);
          hit += 1;
        }
      });
      heatNext = clamp(heatNext + 9);
      ladderLines.push(
        `THE PODCAST WEIGHS IN \u2014 ${hit} people: \u22123 to what they'll say. ${backfired} people: +6 to that and +5 to where they actually stand. +9 heat. ` +
        `Eleven minutes on your campaign from four million subscribers and a man who has never been in the building. ` +
        `The stubborn and the hotheaded hear an outsider telling them what to think about their own workplace, and sign up harder.`
      );
    }
  }
  if (ladderLines.length) steps.push({ label: "FROM OUTSIDE THE BUILDING", sub: "The better this goes, the further up the company it gets escalated.", workers: w.map(x => ({ ...x })), lines: ladderLines, notes: ladderNotes });

  // --- MANAGEMENT ---
  // The hotter it has been, the more of it cools off over a quiet week — otherwise one
  // aggressive stretch pins heat at 100 and the shop never gets back off the radar.
  heatNext = clamp(heatNext - (5 + Math.floor(heatNext / 12)), 0, 100);
  const mgmtLines = [];
  // A big committee is hard to keep quiet. Every member past four is one more person
  // who might mention a meeting in the wrong room.
  const bigCommittee = sizeHeat(w);
  if (bigCommittee > 0) {
    heatNext = clamp(heatNext + bigCommittee);
    mgmtLines.push(`A committee of ${committeeOf(w).length} is a lot of people who know about the meetings. +${bigCommittee} heat this week.`);
  }
  // The more people in the room, the likelier somebody repeats it. Never one of the two
  // who started this, and nobody is told.
  if (random() < sizeLeakChance(w)) {
    const pool = committeeOf(w).filter(x => !x.leak && !ACT1_WORKERS_SEED.find(s => s.id === x.id)?.organizer);
    if (pool.length) { const x = pool[rand(pool.length)]; x.leak = true; stats.leaksJoined = (stats.leaksJoined || 0) + 1; }
  }
  // A leak does not announce itself. Management simply knows more than it should.
  const leakWarmth = leakHeat(w);
  if (leakWarmth > 0) {
    heatNext = clamp(heatNext + leakWarmth);
    mgmtLines.push(`Somebody upstairs knows when the committee met, and where. +${leakWarmth} heat.`);
  }
  if (heatNext >= 45 && random() < 0.55) {
    const roll = rand(100);
    if (roll < 45) {
      // ORG-CHART MOVE. He books a department, not a set of relationships, so the
      // blow is absorbed in proportion to how many trusted signed coworkers each
      // person already has around them.
      const teams = ["engineering", "qa", "production"];
      const meetTeam = teams[rand(teams.length)];
      let held = 0, hitTotal = 0, hitCount = 0, shrugged = 0;
      w.forEach(x => {
        if (x.burned || x.signed || x.team !== meetTeam) return;
        if (holdsFast(x)) { held += 1; return; }
        const raw = Math.max(2, Math.round(7 - x.support / 20));
        const resist = orgChartResistance(signedBacking(influence, w, x.id));
        const hit = Math.max(1, Math.round(raw * resist));
        if (resist <= 0.45) shrugged += 1;
        x.support = clamp(x.support - hit);
        x.trueSupport = clamp((x.trueSupport ?? x.support) - Math.round(hit * 0.4));
        hitTotal += hit; hitCount += 1;
      });
      mgmtLines.push(
        `CAPTIVE-AUDIENCE MEETING \u2014 ${TEAM_LABEL[meetTeam]} \u2014 ${hitCount} hit, average \u2212${hitCount ? Math.round(hitTotal / hitCount) : 0} to what they'll say, and about half that off where they stand.` +
        (shrugged ? ` ${shrugged} of them barely moved: they already have people they trust more who've signed.` : "") +
        (held ? ` ${held} stubborn holdout${held === 1 ? "" : "s"} sat through it unmoved.` : "") +
        ` Attendance was mandatory for the department. It is not a mandatory meeting for a friendship.`
      );
      heatNext = clamp(heatNext - 8);
    } else if (roll < 78) {
      // The one org-chart move that DOES work, because it operates on material
      // interest rather than persuasion. A department really can be bought.
      const buyTeams = ["engineering", "qa", "production"];
      const pickTeam = buyTeams[rand(buyTeams.length)];
      const lucky = w.filter(x => !x.burned && x.team === pickTeam);
      lucky.forEach(x => { x.fulfillment = clamp(x.fulfillment + 12); });
      mgmtLines.push(`${CONSULTANT_NAME_UC} BUYS A DEPARTMENT \u2014 ${TEAM_LABEL[pickTeam]}: fulfillment +12 (${lucky.length} people). Higher fulfillment means more to lose: every card ask in ${TEAM_LABEL[pickTeam]} is now harder. New hardware, a hiring-freeze lift, and an offsite, announced to one team and no one else.`);
      heatNext = clamp(heatNext - 6);
    } else {
      const candidates = w.filter(x => x.organizer && !x.burned);
      if (candidates.length > 1) {
        const mark = candidates[rand(candidates.length)];
        mark.shaken = 1;
        mgmtLines.push(`${mark.name} gets a new weekly one-on-one with a skip-level manager. Nothing is said outright. They'll have less room to move next week.`);
      } else if (candidates.length === 1) {
        mgmtLines.push(`Management starts asking around about who's behind this. Nobody gives ${candidates[0].name} up — this time.`);
      }
      heatNext = clamp(heatNext - 4);
    }
  }
  if (mgmtLines.length) steps.push({ label: "MANAGEMENT RESPONDS", sub: "Somebody upstairs is paying attention now.", workers: w.map(x => ({ ...x })), lines: mgmtLines });

  // --- THE CONSULTANT ---
  // Once the committee is clearly working, management stops improvising and hires
  // someone. From then on there is a second organizer on the floor, working the same
  // relationships in the opposite direction.
  let consultantNext = { ...consultant };
  const consultantLines = [];
  const consultantNotes = {};
  const consultantPulses = [];
  const consultantPerks = [];

  // A perk wears off. People work out that the dog day was a one-off, and the thing
  // they have in common goes back to being theirs.
  let perksNext = perks.filter(pk => pk.until > week);
  perks.filter(pk => pk.until <= week).forEach(pk => {
    const aff = AFF_BY_ID[pk.id];
    w.forEach(x => { x.poisoned = poisonedAff(x).filter(t => t !== pk.id); });
    consultantLines.push(
      `PERK WEARS OFF \u2014 ${aff?.perk ?? pk.id}. \u201C${aff?.label ?? pk.id}\u201D counts as common ground again. ` +
      `The budget line was quietly not renewed. Nobody announces that part.`
    );
  });
  const committeeNow = w.filter(x => x.organizer && !x.burned).length;
  const signedForTrigger = w.filter(x => x.signed).length;

  if (!consultantNext.active && (committeeNow >= CONSULTANT_TRIGGER_COMMITTEE || signedForTrigger >= ACT1_CARDS_NEEDED - 2)) {
    consultantNext = { ...consultantNext, active: true, arrivedWeek: week };
    consultantLines.push(`A consultant from ${CONSULTANT_FIRM} is on site by Wednesday. ${CONSULTANT_NAME} has a badge, a corner office nobody was using, and a list of names.`);
    consultantLines.push(`WHAT HE DOES: two one-on-ones a week, aimed at the highest-support person who isn't already surrounded by signed coworkers. Each costs that person up to \u22128 off what they'll say and 60% of that off where they actually stand. Every ${CONSULTANT_SETPIECE_GAP} weeks he runs one set piece \u2014 a raise offered to a waverer, or a job threat aimed at your most isolated committee member \u2014 ${CONSULTANT_MAX_EACH} of each, all campaign.`);
    consultantLines.push(`WHAT BLUNTS HIM: signed coworkers who carry weight with the target. Every 30 points of that backing takes 1 off the blow, to a floor of 1. Below ${KIRKMAN_SIGHT} heat he can't see your map and picks names off the org chart instead, which lands at 55% strength. Your own visibility is what teaches him where to aim.`);
  } else if (consultantNext.active) {
    // One-on-ones: he works the people closest to signing, minus whoever is already
    // surrounded by organizers. Density is the defence.
    // Once a petition is filed he stops being a side project and works the floor full
    // time — this is the stretch where campaigns are actually lost.
    const inCampaign = stage === "campaign";
    // Below the sight threshold he is picking names off an org chart: whoever looks
    // wobbly on paper, by department. Above it, the campaign has been loud enough
    // that he can see who is actually isolated — and that is when he gets dangerous.
    // A leak on the committee hands him the map whatever the heat.
    const leaking = activeLeaks(w);
    const seesNetwork = heat >= KIRKMAN_SIGHT || inCampaign || leaking.length > 0;
    const leakFriends = new Set(leaking.flatMap(l => friendsOf(social, l.id)));
    const marks = w
      .filter(x => !x.burned && x.support >= 30 && (inCampaign || !x.signed))
      .map(x => {
        const backing = seesNetwork ? signedBacking(influence, w, x.id) : 0;
        // He starts with whoever the leak is closest to.
        return { t: x, backing, score: x.support - backing * 0.35 - (x.signed ? 25 : 0) + (leakFriends.has(x.id) ? 40 : 0) };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, inCampaign ? 4 : 2);

    marks.forEach(({ t, backing }) => {
      if (holdsFast(t)) {
        t.pressuredCount = (t.pressuredCount || 0) + 1;
        consultantNotes[t.id] = `${CONSULTANT_NAME_UC} gets nowhere`;
        consultantLines.push(`NO MOVEMENT \u2014 ${t.name}: nothing moves, either way. STUBBORN ignores everything ${CONSULTANT_NAME} does, permanently. It cuts both ways \u2014 they were hard to bring over, and now they're impossible to take back.`);
        return;
      }
      const realBacking = signedBacking(influence, w, t.id);
      const resist = Math.min(5, Math.round(realBacking / 30));
      const blind = seesNetwork ? 1 : 0.55; // guessing from the reporting line costs him
      const hit = Math.max(1, Math.round((8 - resist) * blind));
      const before = t.support;
      t.support = clamp(t.support - hit);
      t.trueSupport = clamp((t.trueSupport ?? t.support) - Math.round(hit * 0.6));
      t.underPressure = 2;
      t.pressuredCount = (t.pressuredCount || 0) + 1;
      consultantNotes[t.id] = `${CONSULTANT_NAME_UC} works on them`;
      consultantLines.push(
        `${seesNetwork ? "TARGETED 1:1" : "ORG-CHART 1:1"} \u2014 ${t.name}: \u2212${before - t.support} to what they'll say, \u2212${Math.round((before - t.support) * 0.6)} to where they stand. ` +
        `Base 8` +
        (resist > 0 ? `, \u2212${resist} from ${Math.round(realBacking)} signed backing` : "") +
        (!seesNetwork ? `, \u00d70.55 because he's guessing off the reporting line` : "") +
        `. ` +
        `${CONSULTANT_ONE_ON_ONES[rand(CONSULTANT_ONE_ON_ONES.length)](t.name)}` +
        (resist >= 3 ? ` It lands soft: ${t.name} has heard all of it already, from people they trust more.` : "") +
        (realBacking < 20 ? ` Nobody who has signed carries any weight with them, so there was nothing in the way.` : "")
      );
      t.history.push(`Week ${week}: ${CONSULTANT_NAME} worked on them (-${before - t.support} support).`);
    });

    if (inCampaign) {
      // The biggest single effect in the whole counter-campaign, and the easiest to
      // miss because it touches everybody at once. So it reports its own total.
      let meetingTotal = 0, meetingCount = 0, meetingWorst = 0;
      w.forEach(x => {
        if (x.burned) return;
        const backing = signedBacking(influence, w, x.id);
        const hit = Math.max(1, Math.round(4 - backing / 70 - (x.signed ? 1 : 0)));
        x.support = clamp(x.support - hit);
        meetingTotal += hit; meetingCount += 1; meetingWorst = Math.max(meetingWorst, hit);
      });
      consultantLines.push(
        `CAPTIVE-AUDIENCE MEETING \u2014 all ${meetingCount} workers. Not one vote moves. ` +
        `A mandatory meeting changes what people are willing to say out loud, not what they'd do behind a curtain, ` +
        `so every number this costs you is a number you were reading, not a number you had. ` +
        `Up to \u2212${meetingWorst} each off what they'll admit to \u2014 least from the ones who have signed, ` +
        `and least of all from the ones with signed coworkers they trust standing behind them.`
      );
      consultantLines.push(
        `WHICH IS THE POINT. He is not trying to change minds in that room; he is trying to make the room unreadable, ` +
        `so that you spend your last weeks reassuring people who were never going to leave and miss the ones who were. ` +
        `The only cure is a conversation: anyone you have actually sat down with still reads true. ` +
        `Paid time, catered, and nobody from the union side allowed to answer back. It runs again every week until the ballot.`
      );
    }

    // Set pieces, spaced out: the raise and the threat.
    const sinceLast = week - (consultantNext.lastSetPiece || 0);
    if (sinceLast >= CONSULTANT_SETPIECE_GAP) {
      const canRaise = consultantNext.raises < CONSULTANT_MAX_EACH;
      const canThreat = consultantNext.threats < CONSULTANT_MAX_EACH;
      const threatPool = w.filter(x => x.organizer && !x.burned);
      const raisePool = w.filter(x => !x.burned && !x.organizer && (x.signed || x.support >= 55));

      // The third set piece: buy a thing people have in common. Not aimed at a person
      // at all — aimed at the common ground the campaign was travelling along.
      const alreadyPoisoned = new Set(w.flatMap(x => poisonedAff(x)));
      const perkCandidates = AFFINITY_POOL.filter(a => !alreadyPoisoned.has(a.id))
        .map(a => {
          const holders = w.filter(x => !x.burned && affList(x).includes(a.id));
          // Blind, he reads a headcount off an HR field: whatever the most people have.
          // Sighted, he can see which shared thing your committee is actually
          // travelling along, and buys that one instead.
          const reach = seesNetwork
            ? w.filter(x => x.organizer && !x.burned).reduce((n, org) => n + (affList(org).includes(a.id)
                ? w.filter(x => !x.burned && !x.signed && x.id !== org.id && affList(x).includes(a.id)).length
                : 0), 0)
            : holders.filter(x => !x.signed).length;
          return { a, holders, reach };
        })
        .filter(c => c.holders.length >= 2 && c.reach > 0)
        .sort((x, y) => y.reach - x.reach);
      const canPerk = consultantNext.perks < CONSULTANT_MAX_EACH && perkCandidates.length > 0;

      const options = [];
      if (canThreat && threatPool.length > 1) options.push("threat");
      if (canRaise && raisePool.length) options.push("raise");
      if (canPerk) options.push("perk");
      const rumorPair = (consultantNext.rumors || 0) < CONSULTANT_MAX_EACH ? pickRumor(w, social) : null;
      if (rumorPair) options.push("rumor");
      const chosen = options.length ? options[rand(options.length)] : null;
      const doThreat = chosen === "threat";

      if (chosen === "rumor") {
        // He does not need to turn anybody. He only needs two friends to stop trusting
        // each other, and he picks the friendship your committee is travelling along.
        const [ra, rb] = rumorPair;
        consultantNext = { ...consultantNext, rumors: (consultantNext.rumors || 0) + 1, lastSetPiece: week };
        const res = breakFriendship(w, social, ra, rb, week, { seen: true });
        social.rumors.push({ a: ra.id, b: rb.id, week });
        stats.rumors = (stats.rumors || 0) + 1;
        consultantNotes[ra.id] = `stops talking to ${rb.name}`;
        consultantNotes[rb.id] = `stops talking to ${ra.name}`;
        consultantLines.push(
          `RUMOR \u2014 ${CONSULTANT_NAME} lets it be known that ${ra.name} said something about ${rb.name}. Whether it is true does not matter. By Friday they are not speaking.` +
          (res.movedTo !== res.movedFrom ? ` ${res.loser.name} drifts away from that crowd.` : "") +
          ` Somebody on the committee talking to either of them this week or next can get the story straight.`
        );
        ra.history.push(`Week ${week}: fell out with ${rb.name} over a rumor.`);
        rb.history.push(`Week ${week}: fell out with ${ra.name} over a rumor.`);
      } else if (chosen === "perk") {
        const { a: aff, holders } = perkCandidates[0];
        consultantNext = { ...consultantNext, perks: (consultantNext.perks || 0) + 1, lastSetPiece: week };
        let trueTotal = 0, fullTotal = 0, held = 0;
        holders.forEach(x => {
          // Poison the tie for everyone who holds it, including people you haven't
          // surfaced yet — you find out it's gone when the conversation lands flat.
          x.poisoned = [...poisonedAff(x), aff.id];
          if (holdsFast(x)) { held += 1; return; }
          const backing = signedBacking(influence, w, x.id);
          const shield = Math.min(6, Math.round(backing / 25));
          const trueHit = Math.max(1, 9 - shield);
          const fullGain = Math.max(2, 12 - shield);
          const beforeTrue = x.trueSupport ?? x.support;
          x.trueSupport = clamp(beforeTrue - trueHit);
          x.support = clamp(x.support - Math.max(1, Math.round(trueHit * 0.4)));
          x.fulfillment = clamp(x.fulfillment + fullGain);
          trueTotal += trueHit; fullTotal += fullGain;
          consultantNotes[x.id] = "BOUGHT";
          x.history.push(`Week ${week}: the company bought ${aff.label.toLowerCase()} (\u2212${trueHit} where they stand).`);
        });
        heatNext = clamp(heatNext - 4);
        consultantPerks.push({ id: aff.id, until: week + PERK_WEEKS });
        consultantLines.push(
          `PERK LANDS \u2014 ${aff.perk.toUpperCase()}. Everyone on the floor who shares \u201C${aff.label}\u201D ` +
          `(${holders.length} ${holders.length === 1 ? "worker" : "workers"}, whether or not you had found them): ` +
          `\u2212${trueTotal} between them off where they actually stand, +${fullTotal} fulfilment, \u22124 heat. ` +
          `${aff.barb}`
        );
        consultantLines.push(
          `AND \u201C${aff.label}\u201D STOPS BEING YOURS for ${PERK_WEEKS} weeks. It no longer counts as common ground in any ` +
          `conversation between two people who share it \u2014 raising it now raises the company. ` +
          `${seesNetwork
            ? `He picked it because it was the thing your committee was actually travelling along.`
            : `He picked it off a headcount in an HR field, not off your map \u2014 he doesn't know yet what it was doing for you.`}` +
          `${held ? ` ${held} STUBBORN ${held === 1 ? "worker takes" : "workers take"} nothing from it, but the tie is poisoned for them too.` : ""}`
        );
      } else if (doThreat) {
        // He goes after the most isolated committee member, not the least convinced —
        // conviction is high on the committee by definition. What decides whether
        // somebody folds under a job threat is whether they're standing alone.
        const markBacking = (x) => signedBacking(influence, w, x.id);
        const mark = [...threatPool].sort((a, b) => markBacking(a) - markBacking(b))[0];
        const foldChance = Math.max(0.1, Math.min(0.5, 0.5 - markBacking(mark) / 300));
        consultantNext = { ...consultantNext, threats: consultantNext.threats + 1, lastSetPiece: week };
        if (random() < foldChance) {
          mark.organizer = false;
          mark.support = clamp(mark.support - 25);
          mark.underPressure = 2;
          consultantNotes[mark.id] = "STEPS BACK";
          consultantLines.push(`JOB THREAT LANDS \u2014 ${mark.name} steps off the committee. That is the damage: their hours are gone, their reach is gone, and everyone who took cues from them loses a little of what they had. They had ${Math.round(markBacking(mark))} signed backing, so this was a ${Math.round(foldChance * 100)}% chance of folding. ${mark.name} is walked into a room with ${CONSULTANT_NAME} and their manager and asked, carefully, whether they've thought about how this looks on a performance file. Nothing actionable is said. They will still vote yes \u2014 nobody talks somebody out of a union by frightening them. They just won't organize anyone else. He picks the most isolated person on your committee, because that is the only kind this works on.`);
          mark.history.push(`Week ${week}: pressured off the committee.`);
          outgoingTies(influence, mark.id).forEach(t => {
            const other = byId(t.id);
            if (!other || other.burned || other.signed) return;
            bump(other, -Math.round((t.weight / 100) * 5));
            consultantPulses.push({ from: mark.id, to: t.id, tone: "down" });
          });
        } else {
          mark.support = clamp(mark.support + 5);
          heatNext = clamp(heatNext + 8);
          consultantNotes[mark.id] = "DOESN'T BLINK";
          consultantLines.push(`JOB THREAT BACKFIRES \u2014 ${mark.name} holds, keeps their seat on the committee, and everyone they carry moves toward you for real. +8 heat. With ${Math.round(markBacking(mark))} signed backing they only had a ${Math.round(foldChance * 100)}% chance of folding \u2014 every 3 points of backing takes 1% off it, which is to say the defence was the people around them, not their nerve. ${CONSULTANT_NAME} asks how this will look on their performance file. ${mark.name} writes down the date, the time, and who was in the room, and tells everyone. Threatening someone's job over a union is illegal, and now it's documented.`);
          mark.history.push(`Week ${week}: threatened, didn't budge, and put it on the record.`);
          outgoingTies(influence, mark.id).forEach(t => {
            const other = byId(t.id);
            if (!other || other.burned || other.signed) return;
            bump(other, Math.round((t.weight / 100) * 6));
            consultantPulses.push({ from: mark.id, to: t.id, tone: "up" });
          });
        }
      } else if (canRaise && raisePool.length) {
        const mark = [...raisePool].sort((a, b) => a.support - b.support)[0];
        const before35 = mark.support;
        const takeChance = Math.min(0.7, Math.max(0.05, (100 - mark.support) / 60));
        consultantNext = { ...consultantNext, raises: consultantNext.raises + 1, lastSetPiece: week };
        if (random() < takeChance) {
          const wasSigned = mark.signed;
          mark.signed = false;
          mark.support = clamp(mark.support - 35);
          mark.underPressure = 2;
          heatNext = clamp(heatNext - 5);
          consultantNotes[mark.id] = wasSigned ? "PULLS THEIR CARD" : "TAKES THE OFFER";
          consultantLines.push(`BUY-OFF LANDS \u2014 ${mark.name}${wasSigned ? " withdraws their card" : " goes quiet"}, and \u22125 heat, because a quiet raise draws no attention. ${wasSigned ? "That card is the damage \u2014 you need thirty percent on paper to file, and it just came off the table. " : ""}He offers it to whoever on your side is cheapest to buy: at ${before35} support that was a ${Math.round(takeChance * 100)}% chance of being taken. They're offered a title bump and a number that solves a real problem at home. They take it. This is the one thing the company does that works on material interest rather than persuasion, which is why it works. Nobody in the room blames them, which is the worst part.`);
          mark.history.push(`Week ${week}: took the raise${wasSigned ? " and withdrew their card" : ""}.`);
        } else {
          mark.support = clamp(mark.support + 8);
          heatNext = clamp(heatNext + 6);
          consultantNotes[mark.id] = "TURNS IT DOWN";
          consultantLines.push(`BUY-OFF REFUSED \u2014 ${mark.name} keeps their card, and everyone they carry moves toward you for real. +6 heat. At ${before35} support it was a ${Math.round(takeChance * 100)}% chance of landing \u2014 the more convinced somebody already is, the less a raise is worth. They're offered a title bump and a raise, quietly, a week after signing on. They turn it down and repeat the offer out loud in the kitchen. Buying one person is cheap; getting caught at it is not.`);
          mark.history.push(`Week ${week}: refused a raise meant to buy them off, and said so publicly.`);
          outgoingTies(influence, mark.id).forEach(t => {
            const other = byId(t.id);
            if (!other || other.burned || other.signed) return;
            bump(other, Math.round((t.weight / 100) * 6));
            consultantPulses.push({ from: mark.id, to: t.id, tone: "up" });
          });
        }
      }
    }
  }
  if (consultantLines.length) {
    steps.push({
      label: consultantNext.arrivedWeek === week ? "A CONSULTANT ARRIVES" : `${CONSULTANT_NAME_UC} WORKS THE FLOOR`,
      sub: consultantNext.arrivedWeek === week
        ? "Management stops improvising and starts paying someone."
        : "The same playbook you're running, pointed the other way.",
      workers: w.map(x => ({ ...x })),
      lines: consultantLines,
      notes: consultantNotes,
      edgePulses: consultantPulses,
    });
  }

  // --- FRIENDSHIPS GIVE WAY ---
  // About once a drive, and more often under the pressure of a petition, two friends stop
  // talking. You see it only if you had mapped that friendship.
  if (random() < (stage === "campaign" ? FALLOUT_TUNING.campaignChance : FALLOUT_TUNING.driveChance)) {
    const pair = pickFallout(w, social);
    if (pair) {
      const [fa, fb] = pair;
      const res = breakFriendship(w, social, fa, fb, week);
      stats.fallouts = (stats.fallouts || 0) + 1;
      if (res.visible) {
        stats.falloutsSeen = (stats.falloutsSeen || 0) + 1;
        steps.push({
          label: "A FALLING OUT", sub: "Friendships do not hold still for a campaign.",
          workers: w.map(x => ({ ...x })),
          lines: [`${fa.name} and ${fb.name} have fallen out. Nobody will say over what.` +
            (res.movedTo !== res.movedFrom && res.loser.circleKnown ? ` ${res.loser.name} drifts away from that crowd.` : "")],
          notes: { [fa.id]: `stops talking to ${fb.name}`, [fb.id]: `stops talking to ${fa.name}` },
        });
        fa.history.push(`Week ${week}: fell out with ${fb.name}.`);
        fb.history.push(`Week ${week}: fell out with ${fa.name}.`);
      }
    }
  }
  // A rumor nobody talked down within the window has set.
  social.rumors = social.rumors.filter(r => week - r.week < RUMOR_REPAIR_WEEKS + 1);

  const signedNow = w.filter(x => x.signed).length;

  // --- ELECTION DAY ---
  let ballot = null;
  if (stage === "campaign" && electionWeek != null && week >= electionWeek) {
    let yes = 0, no = 0;
    const nonVoters = [];
    w.forEach(x => {
      if (random() >= turnoutChance(x)) { nonVoters.push(x.name); return; }
      if (random() < yesChance(x)) yes += 1; else no += 1;
    });
    ballot = { yes, no, out: nonVoters.length, cast: yes + no, won: yes > no };
    steps.push({
      label: "THE BALLOT",
      sub: "Every worker in the unit, one secret ballot each. A majority of the votes cast decides it.",
      workers: w.map(x => ({ ...x })),
      lines: [
        `${ballot.cast} of ${ACT1_TOTAL_WORKERS} workers cast a ballot. ${nonVoters.length} didn't vote at all${nonVoters.length ? ` — ${nonVoters.slice(0, 4).join(", ")}${nonVoters.length > 4 ? ", and others" : ""}` : ""}.`,
        `YES ${ballot.yes} — NO ${ballot.no}.`,
      ],
    });
  }

  steps.push({
    label: "END OF WEEK",
    sub: `Week ${week} complete.`,
    workers: w.map(x => ({ ...x })),
    lines: ballot
      ? [ballot.won ? "The union carries the unit." : "The union falls short."]
      : stage === "campaign"
        ? [`${Math.max(0, electionWeek - week)} week(s) until the vote. Projection right now: ${voteProjection(w).yes} yes, ${voteProjection(w).no} no.`]
        : [`${signedNow} of ${ACT1_TOTAL_WORKERS} cards signed — ${Math.round((signedNow / ACT1_TOTAL_WORKERS) * 100)}% of the floor. You need ${Math.round(ACT1_CARD_THRESHOLD * 100)}% to file.`],
  });

  return {
    steps,
    pending: {
      workers: w,
      heat: heatNext,
      consultant: consultantNext,
      ballot,
      outsidersNext,
      perksNext: [...perksNext, ...consultantPerks],
      social,
      // Reaching 30% no longer ends the game — it unlocks the choice to file.
      reachedThreshold: stage === "drive" && signedNow >= ACT1_CARDS_NEEDED,
    },
    stats,
  };
}
