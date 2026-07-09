"use client";

import { Analytics } from "@/components/Analytics";
import { BackupTools } from "@/components/BackupTools";
import { DebtTracker } from "@/components/DebtTracker";
import { Header } from "@/components/Header";
import { Journal } from "@/components/Journal";
import { LockScreen } from "@/components/LockScreen";
import { PillarChecklist } from "@/components/PillarChecklist";
import { ProgressBar } from "@/components/ProgressBar";
import { SavingsTracker } from "@/components/SavingsTracker";
import { SetupScreen } from "@/components/SetupScreen";
import { YearGrid } from "@/components/YearGrid";
import { TrackerProvider, useTracker } from "@/lib/TrackerContext";

function AppShell() {
  const { isLoading, hasAccount, isUnlocked } = useTracker();

  if (isLoading) return null;
  if (!hasAccount) return <SetupScreen />;
  if (!isUnlocked) return <LockScreen />;

  return (
    <>
      <Header />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
        <ProgressBar />
        <PillarChecklist />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SavingsTracker />
          <DebtTracker />
        </div>
        <Journal />
        <YearGrid />
        <Analytics />
        <BackupTools />
      </main>
    </>
  );
}

export default function Home() {
  return (
    <TrackerProvider>
      <AppShell />
    </TrackerProvider>
  );
}
