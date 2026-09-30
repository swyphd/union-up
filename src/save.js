// Where a run is kept between sessions, and which shape of save this build writes.
// A v2 save carries the whole Act One floor and resumes at either act boundary; a v1
// save (names only) can only rejoin at the company campaign.
export const ACT1_SAVE_KEY = "act1-progress";
export const SAVE_VERSION = 2;
