"use client";

import { useEffect, useMemo, useState } from "react";
import {
  LEVEL_LABELS,
  VOCABULARY,
  type Level,
  type Word,
} from "@/lib/vocabulary";

type Mode = "flashcard" | "quiz" | "browse";
type LevelFilter = Level | "all";
type KnownMap = Record<string, boolean>;

const MODE_LABELS: Record<Mode, string> = {
  flashcard: "📇 Flashcards",
  quiz: "📝 Quiz",
  browse: "📚 Browse",
};

const LEVEL_FILTER_LABELS: Record<LevelFilter, string> = {
  all: "All Levels",
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

const KNOWN_STORAGE_KEY = "english-learning-known-words";

function speak(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "en-US";
  utter.rate = 0.95;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utter);
}

function shuffle<T>(array: T[]): T[] {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export default function Home() {
  const [mode, setMode] = useState<Mode>("flashcard");
  const [levelFilter, setLevelFilter] = useState<LevelFilter>("all");
  const [known, setKnown] = useState<KnownMap>({});
  const [knownHydrated, setKnownHydrated] = useState(false);

  // Flashcard state
  const [cardIndex, setCardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  // Quiz state
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizSelection, setQuizSelection] = useState<string | null>(null);
  const [quizScore, setQuizScore] = useState(0);
  const [quizTotal, setQuizTotal] = useState(0);

  const filteredWords = useMemo(() => {
    if (levelFilter === "all") return VOCABULARY;
    return VOCABULARY.filter((w) => w.level === levelFilter);
  }, [levelFilter]);

  // Load known words from localStorage on mount (client-only).
  useEffect(() => {
    try {
      const saved = localStorage.getItem(KNOWN_STORAGE_KEY);
      if (saved) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setKnown(JSON.parse(saved));
      }
    } catch {
      // ignore
    }
    setKnownHydrated(true);
  }, []);

  // Persist known words after hydration
  useEffect(() => {
    if (!knownHydrated) return;
    try {
      localStorage.setItem(KNOWN_STORAGE_KEY, JSON.stringify(known));
    } catch {
      // ignore
    }
  }, [known, knownHydrated]);

  const currentCard =
    filteredWords[cardIndex % Math.max(filteredWords.length, 1)];
  const currentQuiz =
    filteredWords[quizIndex % Math.max(filteredWords.length, 1)];

  // Derive quiz choices deterministically per question.
  const quizChoices = useMemo<Word[]>(() => {
    if (!currentQuiz) return [];
    const distractorPool = VOCABULARY.filter((w) => w.id !== currentQuiz.id);
    const distractors = shuffle(distractorPool).slice(0, 3);
    return shuffle([currentQuiz, ...distractors]);
  }, [currentQuiz]);

  const knownCount = Object.values(known).filter(Boolean).length;

  const toggleKnown = (id: string) => {
    setKnown((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const nextCard = () => {
    setFlipped(false);
    setCardIndex((i) => (i + 1) % filteredWords.length);
  };
  const prevCard = () => {
    setFlipped(false);
    setCardIndex(
      (i) => (i - 1 + filteredWords.length) % filteredWords.length
    );
  };

  const handleQuizAnswer = (choiceId: string) => {
    if (quizSelection !== null || !currentQuiz) return;
    setQuizSelection(choiceId);
    setQuizTotal((t) => t + 1);
    if (choiceId === currentQuiz.id) {
      setQuizScore((s) => s + 1);
    }
  };

  const nextQuiz = () => {
    setQuizSelection(null);
    setQuizIndex((i) => (i + 1) % filteredWords.length);
  };

  const resetQuiz = () => {
    setQuizIndex(0);
    setQuizScore(0);
    setQuizTotal(0);
    setQuizSelection(null);
  };

  const handleModeChange = (newMode: Mode) => {
    setMode(newMode);
    setFlipped(false);
    setQuizSelection(null);
  };

  const handleLevelChange = (newLevel: LevelFilter) => {
    setLevelFilter(newLevel);
    setCardIndex(0);
    setFlipped(false);
    setQuizIndex(0);
    setQuizSelection(null);
    setQuizScore(0);
    setQuizTotal(0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-indigo-950 font-sans">
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                English Vocab Trainer
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                플래시카드 · 퀴즈 · 단어장으로 영어를 배워보세요
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Known words
              </p>
              <p className="text-lg font-semibold text-indigo-600 dark:text-indigo-400">
                {knownCount} / {VOCABULARY.length}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Mode tabs */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {(Object.entries(MODE_LABELS) as [Mode, string][]).map(
            ([key, label]) => (
              <button
                key={key}
                onClick={() => handleModeChange(key)}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${
                  mode === key
                    ? "bg-indigo-600 text-white shadow"
                    : "bg-white text-zinc-600 border border-zinc-300 hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700 dark:hover:bg-zinc-700"
                }`}
              >
                {label}
              </button>
            )
          )}
        </div>

        {/* Level filter */}
        <div className="flex gap-2 mb-8 flex-wrap">
          {(
            Object.entries(LEVEL_FILTER_LABELS) as [LevelFilter, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => handleLevelChange(key)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                levelFilter === key
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "bg-white text-zinc-500 border border-zinc-200 hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700 dark:hover:bg-zinc-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {filteredWords.length === 0 && (
          <div className="text-center py-20 text-zinc-400">
            No words for this level.
          </div>
        )}

        {/* FLASHCARD MODE */}
        {mode === "flashcard" && filteredWords.length > 0 && currentCard && (
          <div>
            <div
              onClick={() => setFlipped((f) => !f)}
              className="group cursor-pointer select-none bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-lg hover:shadow-xl transition-all min-h-80 flex flex-col items-center justify-center p-8 relative"
            >
              <span className="absolute top-4 left-4 text-[10px] uppercase tracking-wider text-zinc-400">
                {LEVEL_LABELS[currentCard.level]}
              </span>
              <span className="absolute top-4 right-4 text-xs text-zinc-400">
                {cardIndex + 1} / {filteredWords.length}
              </span>

              {!flipped ? (
                <div className="text-center">
                  <p className="text-5xl font-bold text-zinc-900 dark:text-zinc-50 mb-3">
                    {currentCard.word}
                  </p>
                  <p className="text-sm text-zinc-400 font-mono mb-4">
                    {currentCard.phonetic}
                  </p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      speak(currentCard.word);
                    }}
                    className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full text-sm font-medium hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                  >
                    🔊 Listen
                  </button>
                  <p className="text-xs text-zinc-400 mt-6">
                    Tap card to flip
                  </p>
                </div>
              ) : (
                <div className="text-center w-full">
                  <p className="text-xs text-zinc-400 uppercase mb-2">
                    {currentCard.partOfSpeech}
                  </p>
                  <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mb-3">
                    {currentCard.meaningKo}
                  </p>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4 italic">
                    {currentCard.meaningEn}
                  </p>
                  <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4 max-w-md mx-auto">
                    <p className="text-sm text-zinc-700 dark:text-zinc-300">
                      &ldquo;{currentCard.example}&rdquo;
                    </p>
                    <p className="text-xs text-zinc-400 mt-1">
                      {currentCard.exampleKo}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 mt-6">
              <button
                onClick={prevCard}
                className="px-5 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-full text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
              >
                ← Prev
              </button>
              <button
                onClick={() => toggleKnown(currentCard.id)}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${
                  known[currentCard.id]
                    ? "bg-green-600 text-white hover:bg-green-700"
                    : "bg-white text-zinc-600 border border-zinc-300 hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700 dark:hover:bg-zinc-700"
                }`}
              >
                {known[currentCard.id] ? "✓ Known" : "Mark as known"}
              </button>
              <button
                onClick={nextCard}
                className="px-5 py-2 bg-indigo-600 text-white rounded-full text-sm font-medium hover:bg-indigo-700 transition-colors"
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {/* QUIZ MODE */}
        {mode === "quiz" && filteredWords.length > 0 && currentQuiz && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Question {quizTotal + (quizSelection ? 0 : 1)} · Score:{" "}
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                  {quizScore}
                </span>
                {quizTotal > 0 && (
                  <span className="text-zinc-400"> / {quizTotal}</span>
                )}
              </p>
              <button
                onClick={resetQuiz}
                className="text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              >
                Reset
              </button>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 shadow-lg">
              <p className="text-xs text-zinc-400 uppercase text-center mb-2">
                What does this word mean?
              </p>
              <div className="text-center mb-2">
                <p className="text-4xl font-bold text-zinc-900 dark:text-zinc-50 inline-block mr-3">
                  {currentQuiz.word}
                </p>
                <button
                  onClick={() => speak(currentQuiz.word)}
                  className="text-indigo-500 hover:text-indigo-700 text-2xl"
                  aria-label="Listen"
                >
                  🔊
                </button>
              </div>
              <p className="text-center text-sm text-zinc-400 font-mono mb-6">
                {currentQuiz.phonetic}
              </p>

              <div className="grid gap-3">
                {quizChoices.map((choice) => {
                  const isCorrect = choice.id === currentQuiz.id;
                  const isSelected = quizSelection === choice.id;
                  const showResult = quizSelection !== null;

                  let classes =
                    "w-full text-left px-4 py-3 rounded-lg border text-sm transition-colors ";
                  if (!showResult) {
                    classes +=
                      "bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-zinc-700 dark:text-zinc-200";
                  } else if (isCorrect) {
                    classes +=
                      "bg-green-50 dark:bg-green-900/30 border-green-500 text-green-700 dark:text-green-400";
                  } else if (isSelected) {
                    classes +=
                      "bg-red-50 dark:bg-red-900/30 border-red-500 text-red-700 dark:text-red-400";
                  } else {
                    classes +=
                      "bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-400";
                  }

                  return (
                    <button
                      key={choice.id}
                      onClick={() => handleQuizAnswer(choice.id)}
                      disabled={showResult}
                      className={classes}
                    >
                      {choice.meaningKo}
                      {showResult && isCorrect && " ✓"}
                      {showResult && isSelected && !isCorrect && " ✗"}
                    </button>
                  );
                })}
              </div>

              {quizSelection !== null && (
                <div className="mt-6 pt-6 border-t border-zinc-200 dark:border-zinc-800">
                  <p className="text-sm text-zinc-700 dark:text-zinc-300">
                    &ldquo;{currentQuiz.example}&rdquo;
                  </p>
                  <p className="text-xs text-zinc-400 mt-1">
                    {currentQuiz.exampleKo}
                  </p>
                  <button
                    onClick={nextQuiz}
                    className="mt-4 w-full px-5 py-3 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                  >
                    Next Question →
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* BROWSE MODE */}
        {mode === "browse" && filteredWords.length > 0 && (
          <div className="grid gap-3">
            {filteredWords.map((w) => (
              <div
                key={w.id}
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-baseline gap-3 mb-1 flex-wrap">
                      <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                        {w.word}
                      </h3>
                      <span className="text-xs text-zinc-400 font-mono">
                        {w.phonetic}
                      </span>
                      <span className="text-[10px] text-zinc-400 uppercase">
                        {w.partOfSpeech}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full ${
                          w.level === "beginner"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : w.level === "intermediate"
                              ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                              : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        }`}
                      >
                        {w.level}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                      {w.meaningKo}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 italic">
                      {w.meaningEn}
                    </p>
                    <div className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
                      &ldquo;{w.example}&rdquo;
                    </div>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {w.exampleKo}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 items-end">
                    <button
                      onClick={() => speak(w.word)}
                      className="text-indigo-500 hover:text-indigo-700 text-xl"
                      aria-label={`Listen to ${w.word}`}
                    >
                      🔊
                    </button>
                    <button
                      onClick={() => toggleKnown(w.id)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        known[w.id]
                          ? "bg-green-600 text-white"
                          : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                      }`}
                    >
                      {known[w.id] ? "✓" : "○"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
