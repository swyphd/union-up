// The staircase. One mechanic at a time: the next one opens once the player has used the
// last one, the way a factory game unlocks a machine only after you have run the one
// before it. Everything here is display and gating in the UI; the engine never sees it,
// so the sims play the same game they always did.
//
// Each lesson names the actions it opens, the goal that finishes it, and how far along
// the goal is. Progress is read from the floor itself, so a lesson can never be finished
// without the thing it teaches having happened.
import { readOf } from "../../engine/act1/election.js";

const LESSONS = [
  {
    id: "chat",
    title: "QUICK CHATS",
    opens: ["quick"],
    unlocked: "Click anyone on the floor and send Wendell or Camille for a quick chat.",
    body: "An hour each. A chat puts a hollow number on their card: what they say, which is a ceiling. Most people are that or lower.",
    goal: "Talk to three people.",
    need: 3,
    progress: (workers) => workers.filter(x => !x.organizer && !x.burned && x.spokenTo).length,
  },
  {
    id: "sitdown",
    title: "THE SIT-DOWN",
    opens: ["deep"],
    unlocked: "The sit-down is open. The board now shows the map you are drawing: a line is a friendship you know about.",
    body: "Two hours. A hollow digit is only their words; a sit-down turns it solid, and maps all their friends and their crowd. The dots on a card are that person's friends; hover one for the name. Pick somebody with a way in: a friend, or something in common. On a stranger it lands as a pitch.",
    goal: "Get one solid read.",
    need: 1,
    progress: (workers, week) => workers.filter(x => !x.organizer && !x.burned && readOf(x, week).exact).length,
  },
  {
    id: "ask",
    title: "THE CARD",
    opens: ["ask"],
    unlocked: "You can ask for a signature now.",
    body: "A solid 5 signs. A solid 4 could go either way on paper. A hollow anything is usually lower underneath, and a no makes the next ask harder. Ask the solid 5.",
    goal: "Get one card signed.",
    need: 1,
    progress: (workers) => workers.filter(x => !x.organizer && x.signed).length,
  },
  {
    id: "recruit",
    title: "THE COMMITTEE",
    opens: ["recruit"],
    unlocked: "Somebody who signed can be brought onto the committee.",
    body: "Three hours. They have to hear it from a friend on the committee, or through a signed friend you both know. Then their hours are yours to spend, and their friends are yours to reach. Open a signed person's card: the recruit button says who can ask, or what to do first.",
    goal: "Bring one person onto the committee.",
    need: 1,
    progress: (workers) => Math.max(0, workers.filter(x => x.organizer && !x.burned).length - 2),
  },
];
// Past the last lesson everything is open.
const LESSONS_DONE = LESSONS.length;

// The lesson the floor has earned, from the floor alone. The game keeps the higher of
// this and what it already reached, so a lesson never closes again.
function lessonFrom(workers, week) {
  let i = 0;
  while (i < LESSONS.length && LESSONS[i].progress(workers, week) >= LESSONS[i].need) i++;
  return i;
}

const ALWAYS_OPEN = ["checkin", "drop", "inoculate", "debrief", "standwith", "turnout"];
// Which actions a worker panel may offer at this lesson. `null` means no gate at all.
function openActions(lesson) {
  if (lesson == null || lesson >= LESSONS_DONE) return null;
  return new Set([...ALWAYS_OPEN, ...LESSONS.slice(0, lesson + 1).flatMap(l => l.opens)]);
}

// Phase 2 has its own three beats, keyed by the kind of move on the calendar: the meeting,
// the perk, and then the moves aimed at one person. For a player still on the lessons the
// first two are booked in that order, and the beat shows for the first weeks after filing.
const CAMPAIGN_SCRIPT = ["meeting", "perk"];
const CAMPAIGN_LESSON_WEEKS = 3;
const CAMPAIGN_LESSONS = {
  meeting: {
    title: "GET THERE FIRST",
    body: "Management's move for the week is on the red strip above the floor. A captive-audience meeting hits a whole department. Click the strip, or drag one of your people onto the red box: whoever gets there first takes most of the sting out of it for everyone they reach. Somebody from that department reaches all of it.",
  },
  perk: {
    title: "THE PERK",
    body: "This week the company buys the thing one crowd has in common. Unless a committee member who runs with that crowd gets there first, their friendships stop working for you for a while. The crowd is a bubble on the social map; drop one of your people on it.",
  },
  threat: {
    title: "ONE PERSON AT A TIME",
    body: "A job threat for a committee member. Alone, people fold. With somebody from the committee beside them, it backfires. Open their card and stand with them.",
  },
  raise: {
    title: "ONE PERSON AT A TIME",
    body: "A raise for somebody who signed. Alone, people take it and pull their card. With somebody from the committee beside them, they turn it down out loud. Open their card and stand with them.",
  },
};
const campaignLesson = (move, week, filedWeek) =>
  (move && filedWeek != null && week - filedWeek < CAMPAIGN_LESSON_WEEKS) ? CAMPAIGN_LESSONS[move.kind] || null : null;

export { LESSONS, LESSONS_DONE, lessonFrom, openActions, CAMPAIGN_SCRIPT, CAMPAIGN_LESSONS, campaignLesson };
