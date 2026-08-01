"use client";

import type { ReactNode } from "react";
import { TopBar } from "./TopBar";
import { BottomNav } from "./BottomNav";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <TopBar />
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 pb-24 pt-4">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
