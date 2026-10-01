// Where everybody sits on the social view. Pure: the same floor knowledge always gives the
// same picture, and the picture only changes when the knowledge does.
//
// Placed: your own people, anyone whose crowd you know, anyone with a friendship you have
// mapped. Everyone else waits in the tray. A discovered circle gets an anchor and a
// bubble; friendships are springs; a known loner drifts to the margin. Positions carry
// over from the last layout, so a week that maps nothing new moves nothing, and a person
// leaving the tray rises out of their tray slot rather than appearing from nowhere.
import { forceSimulation, forceLink, forceManyBody, forceCollide, forceX, forceY } from "d3-force";
import { CIRCLES, CIRCLE_BY_ID, knownFriends, friendsOf } from "../../engine/act1/friends.js";

const SOCIAL_SCALE = 0.8;
const GRAPH_TOP = 8;
const GRAPH_H = 170;
const TRAY_GAP = 3;
const TRAY_LABEL = 9;
const MARGIN = 6;

const isPlaced = (w) => !!(w.organizer || w.circleKnown || knownFriends(w).length > 0);
const circleOf = (social, w) => (w.circleKnown ? social?.circleOf?.[w.id] || null : null);

function socialSignature(workers, social) {
  return workers.map(w => `${w.id}:${isPlaced(w) ? 1 : 0}${circleOf(social, w) || "-"}:${knownFriends(w).slice().sort((a, b) => a - b).join(".")}`).join("|");
}

function computeSocialLayout({ workers, social, width, cardW, cardH, prev = null }) {
  const cw = cardW * SOCIAL_SCALE, ch = cardH * SOCIAL_SCALE;
  const GAP = 2.5, PAD = { side: 3.5, top: 8, bottom: 3.5 };
  const placed = workers.filter(isPlaced);
  const unplaced = workers.filter(w => !isPlaced(w));
  const pos = {};

  // ---- blocks: each crowd you have found is one block of cards in a bubble; everyone
  //      else on the map is a block of one. Blocks are what get laid out. ----
  const blocks = [];
  const blockOf = {};
  CIRCLES.forEach(c => {
    const members = placed.filter(w => circleOf(social, w) === c.id).sort((x, y) => x.id - y.id);
    if (!members.length) return;
    const cols = members.length <= 2 ? members.length : members.length <= 4 ? 2 : 3;
    const rows = Math.ceil(members.length / cols);
    const bw = cols * cw + (cols - 1) * GAP + 2 * PAD.side, bh = rows * ch + (rows - 1) * GAP + PAD.top + PAD.bottom;
    const blk = { key: `c:${c.id}`, circle: c, members, cols, w: bw, h: bh };
    blocks.push(blk); members.forEach(m => { blockOf[m.id] = blk; });
  });
  placed.filter(w => !blockOf[w.id]).forEach(w => {
    const blk = { key: `w:${w.id}`, members: [w], cols: 1, w: cw, h: ch, loner: w.circleKnown && !social?.circleOf?.[w.id] };
    blocks.push(blk); blockOf[w.id] = blk;
  });

  // ---- anchors: one per crowd around an ellipse; known loners to the right margin ----
  const cx0 = width / 2, cy0 = GRAPH_TOP + GRAPH_H / 2;
  const rx = width * 0.33, ry = GRAPH_H * 0.32;
  const anchor = {};
  CIRCLES.forEach((c, i) => {
    const t = -Math.PI / 2 + (i * 2 * Math.PI) / CIRCLES.length;
    anchor[c.id] = { x: cx0 + rx * Math.cos(t), y: cy0 + ry * Math.sin(t) };
  });
  const lonerAnchor = { x: width - MARGIN - cw / 2, y: GRAPH_TOP + GRAPH_H - ch / 2 };

  // ---- seed each block from where its people were last time ----
  const prevPos = prev || {};
  const nodes = blocks.map(blk => {
    const seen = blk.members.map(m => prevPos[m.id]).filter(p => p && !p.tray);
    const friend = blk.members.flatMap(m => knownFriends(m)).map(id => prevPos[id]).find(p => p && !p.tray);
    const a = blk.circle ? anchor[blk.circle.id] : blk.loner ? lonerAnchor : null;
    let x, y;
    if (seen.length) { x = seen.reduce((t, p) => t + p.cx, 0) / seen.length; y = seen.reduce((t, p) => t + p.cy, 0) / seen.length; }
    else if (friend) { x = friend.cx + 8; y = friend.cy + 6; }
    else if (a) { x = a.x; y = a.y; }
    else { x = cx0; y = cy0; }
    // A block that was already on the map is held near where it was, so mapping one more
    // person does not rearrange everybody else.
    return { id: blk.key, blk, x, y, anchor: a, home: seen.length ? { x, y } : null };
  });
  const nodeOf = Object.fromEntries(nodes.map(n => [n.id, n]));
  // A friendship between two blocks is a spring between them.
  const links = [], seenPair = new Set();
  placed.forEach(w => knownFriends(w).forEach(f => {
    const A = blockOf[w.id], B = blockOf[f];
    if (!A || !B || A === B) return;
    const k = [A.key, B.key].sort().join("|");
    if (seenPair.has(k)) return;
    seenPair.add(k); links.push({ source: A.key, target: B.key });
  }));

  if (nodes.length) {
    const sim = forceSimulation(nodes)
      .force("link", forceLink(links).id(d => d.id).distance(d => (d.source.blk.w + d.target.blk.w) / 2 + 8).strength(0.3))
      .force("charge", forceManyBody().strength(-60).distanceMax(140))
      .force("collide", forceCollide(d => Math.hypot(d.blk.w, d.blk.h) / 2).strength(0.8))
      .force("x", forceX(d => (d.home ? d.home.x : d.anchor ? d.anchor.x : cx0)).strength(d => (d.home ? 0.45 : d.anchor ? 0.3 : 0.02)))
      .force("y", forceY(d => (d.home ? d.home.y : d.anchor ? d.anchor.y : cy0)).strength(d => (d.home ? 0.45 : d.anchor ? 0.3 : 0.02)))
      .stop();
    // A map that already exists settles from a gentle start rather than a full shake.
    if (nodes.some(n => n.home)) sim.alpha(0.35);
    // Sides and top are hard edges; the bottom is not. A full map needs more room than an
    // empty one, so the map grows downward and the tray moves down with it.
    const clampNode = (n) => {
      n.x = Math.max(MARGIN + n.blk.w / 2, Math.min(width - MARGIN - n.blk.w / 2, n.x));
      n.y = Math.max(GRAPH_TOP + n.blk.h / 2, n.y);
    };
    for (let i = 0; i < 260; i++) { sim.tick(); nodes.forEach(clampNode); }
    // Blocks are rectangles and the collision force thinks in circles: finish by pushing
    // any overlapping pair apart along their shallower axis.
    for (let pass = 0; pass < 200; pass++) {
      let moved = false;
      for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        const ox = (a.blk.w + b.blk.w) / 2 + GAP - Math.abs(a.x - b.x), oy = (a.blk.h + b.blk.h) / 2 + GAP - Math.abs(a.y - b.y);
        if (ox <= 0 || oy <= 0) continue;
        moved = true;
        if (ox < oy) { const d = (ox / 2) * (Math.sign(a.x - b.x) || 1); a.x += d; b.x -= d; }
        else { const d = (oy / 2) * (Math.sign(a.y - b.y) || 1); a.y += d; b.y -= d; }
      }
      nodes.forEach(clampNode);
      if (!moved) break;
    }
    // Cards inside each block, in a fixed order so a crowd does not reshuffle week to week.
    nodes.forEach(n => {
      const { blk } = n;
      const x0 = n.x - blk.w / 2 + (blk.circle ? PAD.side : 0), y0 = n.y - blk.h / 2 + (blk.circle ? PAD.top : 0);
      blk.members.forEach((m, i) => {
        const col = i % blk.cols, row = Math.floor(i / blk.cols);
        const x = x0 + col * (cw + GAP), y = y0 + row * (ch + GAP);
        pos[m.id] = { x, y, w: cw, h: ch, cx: x + cw / 2, cy: y + ch / 2, scale: SOCIAL_SCALE, tray: false };
      });
      blk.x = n.x - blk.w / 2; blk.y = n.y - blk.h / 2;
    });
  }

  // ---- the tray, below the map, in org-chart order ----
  const graphBottom = Math.max(GRAPH_TOP + GRAPH_H, ...nodes.map(n => n.y + n.blk.h / 2 + 4));
  const trayY = graphBottom + TRAY_LABEL;
  const perRow = Math.max(1, Math.floor((width - 2 * MARGIN + TRAY_GAP) / (cw + TRAY_GAP)));
  const trayRows = Math.ceil(unplaced.length / perRow);
  const teamOrder = { engineering: 0, qa: 1, production: 2 };
  [...unplaced].sort((a, b) => teamOrder[a.team] - teamOrder[b.team] || a.id - b.id).forEach((w, i) => {
    const col = i % perRow, row = Math.floor(i / perRow);
    const x = MARGIN + col * (cw + TRAY_GAP), y = trayY + row * (ch + TRAY_GAP);
    pos[w.id] = { x, y, w: cw, h: ch, cx: x + cw / 2, cy: y + ch / 2, scale: SOCIAL_SCALE, tray: true };
  });

  const bubbles = blocks.filter(b => b.circle && b.x != null).map(b => ({
    id: b.circle.id, label: b.circle.label, affinity: b.circle.affinity, hex: b.circle.hex, x: b.x, y: b.y, w: b.w, h: b.h,
  }));
  // Every mapped friendship, card to card, for drawing.
  const edges = [];
  placed.forEach(w => knownFriends(w).forEach(f => { if (w.id < f && pos[f] && !pos[f].tray) edges.push({ source: w.id, target: f }); }));

  const height = unplaced.length ? trayY + trayRows * (ch + TRAY_GAP) + 2 : graphBottom;
  return { pos, bubbles, links: edges, height, trayY: unplaced.length ? trayY : null, unplacedCount: unplaced.length, placedCount: placed.length };
}

// The last layout, so the next one starts from it. One Act One board is live at a time.
let memo = { sig: null, layout: null };
function socialLayoutFor(workers, social, width, cardW, cardH) {
  const sig = socialSignature(workers, social) + `@${width}`;
  if (memo.sig === sig) return memo.layout;
  const layout = computeSocialLayout({ workers, social, width, cardW, cardH, prev: memo.layout?.pos });
  memo = { sig, layout };
  return layout;
}

export { SOCIAL_SCALE, isPlaced, socialSignature, computeSocialLayout, socialLayoutFor, CIRCLE_BY_ID };
