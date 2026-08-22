"use client";

import { CommitmentQuickEntry } from "@/components/CommitmentQuickEntry";
import { CueTimeline } from "@/components/CueTimeline";
import { DayArc } from "@/components/DayArc";
import { DayLevelProgress } from "@/components/DayLevelProgress";
import { HabitLibrary } from "@/components/HabitLibrary";
import { InsightList } from "@/components/InsightList";
import { IntentionInput } from "@/components/IntentionInput";
import { Journal } from "@/components/Journal";
import { MoneyAccountCard } from "@/components/MoneyAccountCard";
import { PendingCommitments } from "@/components/PendingCommitments";
import { RecoveryBanner } from "@/components/RecoveryBanner";
import { ReflectionInput } from "@/components/ReflectionInput";
import { SpecialDayPicker } from "@/components/SpecialDayPicker";

/*
  Today is for acting, not for reviewing.

  Everything that answers "how have I been doing?" — analytics, habit
  strength, promise history, backups — moved to the Week and Journey screens
  and to Settings. What's left is, in order: where you are in the day, whether
  the trajectory needs attention, what you meant to do, the habits themselves,
  the promises you've made, the money moved today, and only then reflection.

  The money cards sit with the acting half rather than the reflective tail: a
  saving or a debt payment is logged at the moment it happens, and a ledger
  you can only reach from the Week screen is one you write up from memory
  later, if at all. They also appear on Week, where the same cards read as
  review beside the rest of the week's totals.

  Self-monitoring is a well-evidenced behaviour-change technique, but it only
  works while it stays light enough to keep doing every day. A screen you have
  to scroll past a dashboard to use is a screen you stop opening.
*/

export default function TodayPage() {
  return (
    <>
      <DayArc />
      <RecoveryBanner />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <IntentionInput />
        <SpecialDayPicker />
      </div>

      <CueTimeline />

      <PendingCommitments />
      <CommitmentQuickEntry />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <MoneyAccountCard account="savings" />
        <MoneyAccountCard account="debt" />
      </div>

      <InsightList limit={2} heading="What would help" />

      <Journal />
      <ReflectionInput />

      <DayLevelProgress />

      <HabitLibrary />
    </>
  );
}
