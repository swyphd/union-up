// The company campaign's clock, costs and set pieces.
import { rand } from "../rng.js";


// ---------- CONSTANTS ----------
const TOTAL_TURNS = 12;
// Filing at turn T puts the vote at T + ACT2_FILING_LEAD. One constant for the filing
// itself, the unwinnable check and the copy, so they cannot drift apart again.
// Act Three runs on MONTHS, not weeks. Four studios from cold to certified inside twelve
// weeks was never credible, and the other two acts are already honest about their
// calendars — twenty-six weeks for one shop, a twelve-month certification year.
//
// The five-month lead stays. Cutting it to two, as first planned, reads better on paper
// and plays much worse: it turns the stretch between the petition and the ballot from a
// phase you fight — driving fear down, answering the captive-audience meetings, getting
// a committee built under pressure — into a formality you file into and hope. Measured,
// it took election odds from 53-82% down to 33-47% and made a single shop the dominant
// strategy. Five months is also the truer number: a contested petition means hearings,
// unit-scope challenges and an employer with every reason to take its time.
const ACT2_FILING_LEAD = 5;
const ACT2_LAST_FILING_TURN = TOTAL_TURNS - ACT2_FILING_LEAD;
// The organizer's week. Every leader who came up from Act One adds one action to it.
const ACT2_BASE_ACTIONS = 10;
// The organizer's own reserve. It only ever moved for a player carrying three or four
// shops at once, so a focused campaign never saw the meter do anything; this is set low
// enough that a heavy week costs something whatever the shape of the campaign.
const ACT2_STAMINA_POOL = 100;
const START_LOCATIONS = [
  { id: "downtown", name: "CORE STUDIO", workers: 12, manager: "hostile", morale: 40, trueSupport: 32, visibility: 5, recruited: 0, legalRisk: 0, fear: 0, status: "organizing", abandonedTurns: 0, electionTurn: null, grievance: null, antiUnion: { active: false, turnsLeft: 0 }, buyOff: { active: false, turnsLeft: 0 }, committee: { active: false, strikes: 0 } },
  { id: "suburban", name: "QA DIVISION", workers: 10, manager: "sympathetic", morale: 40, trueSupport: 34, visibility: 5, recruited: 0, legalRisk: 0, fear: 0, status: "organizing", abandonedTurns: 0, electionTurn: null, grievance: null, antiUnion: { active: false, turnsLeft: 0 }, buyOff: { active: false, turnsLeft: 0 }, committee: { active: false, strikes: 0 } },
  { id: "airport", name: "PUBLISHING WING", workers: 9, manager: "neutral", morale: 40, trueSupport: 33, visibility: 5, recruited: 0, legalRisk: 0, fear: 0, status: "organizing", abandonedTurns: 0, electionTurn: null, grievance: null, antiUnion: { active: false, turnsLeft: 0 }, buyOff: { active: false, turnsLeft: 0 }, committee: { active: false, strikes: 0 } },
  { id: "university", name: "REMOTE TEAM", workers: 8, manager: "neutral", morale: 40, trueSupport: 33, visibility: 5, recruited: 0, legalRisk: 0, fear: 0, status: "organizing", abandonedTurns: 0, electionTurn: null, grievance: null, antiUnion: { active: false, turnsLeft: 0 }, buyOff: { active: false, turnsLeft: 0 }, committee: { active: false, strikes: 0 } },
];

const COMMITTEE_COST = 2;
// Building one after the petition is filed, under the employer's campaign and a clock,
// costs nearly twice as much. You would always rather have done it first.
const COMMITTEE_COST_CAMPAIGN = 5;
const COMMITTEE_MORALE_REQ = 55;
// Lined up with the petition's own recruitment gate. A shop that has recruited enough
// people to file has recruited enough people to have a committee, so the committee is
// never the thing that is arithmetically out of reach.
const COMMITTEE_RECRUIT_PCT_REQ = 0.3;

// ---------- WHAT A LOST ELECTION COSTS ----------
// Bronfenbrenner's finding, as arithmetic: a defeat is not a local event. Every shop
// still organizing watches it, and what they learn is that the company can win. Under
// the NLRB's election bar the unit that lost cannot vote again for a year, which in
// this campaign's calendar means never — so the shop is simply gone.
const ACT2_LOSS_MORALE = 20;
const ACT2_LOSS_TRUE = 16;
// The one that bites, now that fear decides turnout: people who watched a shop lose
// are markedly less willing to be seen voting.
const ACT2_LOSS_FEAR = 16;
// And it lands on the organizer. This is the first thing in the act that ever spends
// real stamina, and it spends more of it the more shops you had in the air.
const ACT2_LOSS_STAMINA = 22;
// A company that has beaten you once reaches for the same tools sooner everywhere else.
const ACT2_EMBOLDENED_RETALIATION = 15;

// ---------- A PETITION IS NOT FREE ----------
// The weeks between filing and the ballot are not weeks off. There are hearings, a unit
// to argue over, an Excelsior list to check, and a mandatory meeting every week that
// somebody has to answer. That comes off the top of the organizer's week whether they
// like it or not, which is the real reason you cannot run four elections at once:
// spreading thin is not punished by a rule, it is punished by the calendar.
// What binds is the MONTHLY budget: two petitions at once has to be a stretch rather
// than the whole calendar.
const ACT2_CAMPAIGN_UPKEEP = 2;

// ---------- A PETITION IS A PUBLIC DOCUMENT WITH YOUR NAME ON IT ----------
// Filing does not lower your profile, it raises it, and the weeks between the petition
// and the ballot are exactly when an employer's lawyers earn their fee. Before this,
// retaliation could not touch a shop at the vote at all — which meant the single most
// dangerous stretch of a real campaign was the safest stretch of this one.
const ACT2_FILING_VISIBILITY = 62;
// An employer's campaign has two or three sharp moments in it, not a firing a week, so
// a shop at the vote is exposed but not hunted: a much lower roll than an organizing
// shop that has drawn attention, and a hard cap on how often they will go this far.
const ACT2_CAMPAIGN_RETALIATION = 14;
const ACT2_CAMPAIGN_CRACKDOWN_CAP = 2;
// What a crackdown does at the vote is frighten people, not argue with them. The
// weekly counter-campaign is already eating support; this is the thing that decides who
// walks past the ballot box, so most of it lands on fear and only a third on the count.
const ACT2_CAMPAIGN_HIT_SCALE = 0.35;
// And what a crackdown costs a shop at the vote is fear, which is the thing that decides
// who turns out. Documenting it does not stop it happening; it stops it working, because
// a floor that can see the union writing it all down is a floor that is less frightened.
const ACT2_RETALIATION_FEAR = 0.6;
const ACT2_DOCUMENT_SHIELD = 0.35;
// A paper trail deters as well as softens. Lawyers who can see that every date, name and
// room is being written down price the next move differently, so a documented shop gets
// moved on half as often — which is what makes the action worth an hour even in the
// months when nothing happens.
const ACT2_DOCUMENT_DETERRENCE = 0.5;

const GRIEVANCE_META = {
  legal: { label: "Misclassification", action: "File an exempt-status complaint", cost: 2, tone: "text-red-400 border-red-800", desc: "PerfAxis flags after-hours Slack activity as 'low engagement' — but those are unpaid hours on an exempt salary. Clear-cut FLSA violation. Legal will stall, but it's on record." },
  material: { label: "Unrenewed licenses", action: "Escalate to management", cost: 1, tone: "text-amber-400 border-amber-800", desc: "Key software licenses weren't renewed after the last round of cuts. Workers are expected to do the same job with fewer tools." },
  noise: { label: "Difficult stakeholders", action: "Hear them out", cost: 1, tone: "text-stone-400 border-stone-700", desc: "Product is pushing for scope creep with no timeline adjustment. Real frustration, but venting about it doesn't build power." },
};

const EXTERNAL_EVENTS = [
  {
    id: "solidarity_wave",
    tone: "positive",
    headline: "NATIONAL NEWS: Workers at a major game studio vote to unionize in a closely watched campaign. Developers everywhere are talking about it.",
    moraleClimate: { tone: "positive", turnsLeft: 2 },
    immediateOrganizingMorale: 6,
    immediateCampaignFear: -10,
  },
  {
    id: "setback_news",
    tone: "negative",
    headline: "NATIONAL NEWS: A high-profile organizing drive at a tech company collapses when the company announces it's shifting work to contractors. The story is everywhere.",
    moraleClimate: { tone: "negative", turnsLeft: 2 },
    immediateOrganizingMorale: -6,
    immediateCampaignFear: 10,
  },
  {
    id: "cost_of_living",
    tone: "mixed",
    headline: "NATIONAL NEWS: A new report on rents and grocery prices dominates the news. Workers are angrier — and more anxious about their paychecks.",
    moraleClimate: { tone: "volatile", turnsLeft: 2 },
    immediateOrganizingMorale: 8,
    immediateCampaignFear: 5,
  },
  {
    id: "pr_blitz",
    tone: "negative",
    headline: "NATIONAL NEWS: The studio's parent company publishes a blog post on 'employee ownership culture' and the risks of 'third-party representation.' It's being forwarded around Slack.",
    seedAntiUnion: true,
    immediateCampaignFear: 8,
  },
  {
    id: "algo_exposed",
    tone: "positive",
    headline: "NATIONAL NEWS: An exposé on AI stack-ranking tools used in tech layoffs goes viral — workers everywhere recognize their own performance reviews in the screenshots.",
    moraleClimate: { tone: "positive", turnsLeft: 2 },
    immediateOrganizingMorale: 7,
    immediateCampaignFear: -8,
  },
  {
    id: "reg_favorable",
    tone: "positive",
    headline: "NATIONAL NEWS: A new pro-labor ruling makes it easier to prove unfair labor practices nationwide.",
    legalClimate: { tone: "favorable", turnsLeft: 3 },
    immediateLegalRiskAll: -15,
  },
  {
    id: "reg_hostile",
    tone: "negative",
    headline: "NATIONAL NEWS: A rollback of federal labor protections emboldens employers to push back harder on organizing.",
    legalClimate: { tone: "hostile", turnsLeft: 3 },
    immediateLegalRiskAll: 10,
  },
];

const ACT2_EFFORT_TIERS = [
  { units: 0, label: "Hold back this month", cost: 0, desc: "Let this site rest — no organizer time spent here. Counts toward recovering stamina." },
  { units: 1, label: "Check in briefly", cost: 1, desc: "A quick pulse-check with a few workers." },
  { units: 2, label: "Have real conversations", cost: 2, desc: "Time on the floor with whoever is around, building trust and momentum." },
  { units: 4, label: "Run a full organizing push", cost: 4, desc: "A serious block of organizer time here this month." },
  { units: 6, label: "Go all-in here", cost: 6, desc: "Everything the organizer can give to this site this month." },
];

const ACT2_CAMPAIGN_TIERS = [
  { units: 0, label: "Hold back this month", cost: 0, desc: "Skip it — fear creeps up and morale slips on its own." },
  { units: 1, label: "Light presence", cost: 1, desc: "A quick show of support against the employer's counter-campaign." },
  { units: 2, label: "Active campaigning", cost: 2, desc: "Real pushback against management's messaging." },
  { units: 4, label: "Full doorknock push", cost: 4, desc: "A serious month of countering the counter-campaign." },
  { units: 6, label: "All-in for the vote", cost: 6, desc: "Everything the organizer has, fighting for this election." },
];


const roll100 = () => rand(100) + 1;

export { TOTAL_TURNS, ACT2_FILING_LEAD, ACT2_LAST_FILING_TURN, ACT2_BASE_ACTIONS, ACT2_STAMINA_POOL, START_LOCATIONS, COMMITTEE_COST, COMMITTEE_COST_CAMPAIGN, COMMITTEE_MORALE_REQ, COMMITTEE_RECRUIT_PCT_REQ, ACT2_LOSS_MORALE, ACT2_LOSS_TRUE, ACT2_LOSS_FEAR, ACT2_LOSS_STAMINA, ACT2_EMBOLDENED_RETALIATION, ACT2_CAMPAIGN_UPKEEP, ACT2_FILING_VISIBILITY, ACT2_CAMPAIGN_RETALIATION, ACT2_CAMPAIGN_CRACKDOWN_CAP, ACT2_CAMPAIGN_HIT_SCALE, ACT2_RETALIATION_FEAR, ACT2_DOCUMENT_SHIELD, ACT2_DOCUMENT_DETERRENCE, GRIEVANCE_META, EXTERNAL_EVENTS, ACT2_EFFORT_TIERS, ACT2_CAMPAIGN_TIERS, roll100 };
