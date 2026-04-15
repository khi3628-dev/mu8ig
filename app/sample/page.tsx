"use client";

import { useState } from "react";
import { VOCABULARY } from "@/lib/vocabulary";

// A short, standalone sample: one flashcard you can flip.
export default function SamplePage() {
  const word = VOCABULARY[0];
  const [flipped, setFlipped] = useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-6">
      <div
        onClick={() => setFlipped((f) => !f)}
        className="cursor-pointer bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-lg p-10 w-full max-w-md text-center"
      >
        {!flipped ? (
          <>
            <p className="text-5xl font-bold text-zinc-900 dark:text-zinc-50">
              {word.word}
            </p>
            <p className="text-sm text-zinc-400 font-mono mt-2">
              {word.phonetic}
            </p>
            <p className="text-xs text-zinc-400 mt-6">Tap to flip</p>
          </>
        ) : (
          <>
            <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
              {word.meaningKo}
            </p>
            <p className="text-sm text-zinc-500 mt-2 italic">
              {word.meaningEn}
            </p>
            <p className="text-sm text-zinc-700 dark:text-zinc-300 mt-4">
              &ldquo;{word.example}&rdquo;
            </p>
          </>
        )}
      </div>
    </div>
  );
}
