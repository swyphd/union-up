// The one strip that carries the current lesson: what just opened, what it is for, and
// how far the goal is. A player who knows the game turns the whole staircase off here.
import React from "react";
import { GraduationCap, X } from "lucide-react";
import { LESSONS, LESSONS_DONE } from "./lessons.js";

function LessonBanner({ lesson, workers, week, justUnlocked, onOff }) {
  if (lesson >= LESSONS_DONE) return null;
  const L = LESSONS[lesson];
  const done = Math.min(L.need, L.progress(workers, week));
  return (
    <div className="mb-4 border-2 border-amber-600 bg-amber-950/20 px-3 py-2.5">
      <div className="flex items-start gap-2">
        <GraduationCap size={16} className="shrink-0 mt-0.5 text-amber-400" />
        <div className="flex-1 min-w-0 text-sm leading-relaxed">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-stencil text-base tracking-wide text-amber-400">{lesson + 1} OF {LESSONS_DONE} · {L.title}</span>
            {justUnlocked && <span className="text-[10px] font-bold tracking-widest border border-teal-600 text-teal-300 px-1.5 py-0.5">JUST OPENED</span>}
          </div>
          {justUnlocked && <div className="text-stone-100">{L.unlocked}</div>}
          <div className="text-stone-400">{L.body}</div>
          <div className="mt-1 text-stone-200">
            <span className="text-stone-500">Goal: </span>{L.goal}{" "}
            <span className={`font-bold ${done >= L.need ? "text-teal-300" : "text-amber-300"}`}>{done} of {L.need}</span>
          </div>
        </div>
        <button type="button" onClick={onOff} title="Turn the lessons off and open every action now" aria-label="Turn the lessons off"
          className="shrink-0 text-[10px] tracking-wide text-stone-500 hover:text-stone-200 flex items-center gap-1">
          <X size={12} /> I KNOW THIS
        </button>
      </div>
    </div>
  );
}

// Phase 2's three beats, one per week after filing. No goal line: the move itself is the goal.
function CampaignLessonBanner({ lesson }) {
  if (!lesson) return null;
  return (
    <div className="mb-4 border-2 border-amber-600 bg-amber-950/20 px-3 py-2.5 flex items-start gap-2 text-sm leading-relaxed">
      <GraduationCap size={16} className="shrink-0 mt-0.5 text-amber-400" />
      <div>
        <span className="font-stencil text-base tracking-wide text-amber-400">{lesson.title}. </span>
        <span className="text-stone-300">{lesson.body}</span>
      </div>
    </div>
  );
}

export { LessonBanner, CampaignLessonBanner };
