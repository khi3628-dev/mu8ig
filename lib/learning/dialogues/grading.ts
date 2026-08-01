export interface BlankGrade {
  turnIndex: number;
  userAnswer: string;
  expected: string;
  correct: boolean;
}

export interface FillBlankResult {
  kind: "fill-blank";
  total: number;
  correct: number;
  grades: BlankGrade[];
  allCorrect: boolean;
}

export interface OrderResult {
  kind: "sentence-order";
  correct: boolean;
  expected: number[];
  actual: number[];
  correctPositions: number;
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function gradeFillBlank(
  userAnswers: Record<number, string>,
  blanks: { turnIndex: number; answer: string }[],
): FillBlankResult {
  const grades: BlankGrade[] = blanks.map((b) => {
    const u = userAnswers[b.turnIndex] ?? "";
    return {
      turnIndex: b.turnIndex,
      userAnswer: u,
      expected: b.answer,
      correct: normalize(u) === normalize(b.answer),
    };
  });
  const correct = grades.filter((g) => g.correct).length;
  return {
    kind: "fill-blank",
    total: blanks.length,
    correct,
    grades,
    allCorrect: correct === blanks.length,
  };
}

export function gradeOrder(actual: number[], expected: number[]): OrderResult {
  const correctPositions = actual.reduce(
    (acc, v, i) => acc + (v === expected[i] ? 1 : 0),
    0,
  );
  return {
    kind: "sentence-order",
    correct:
      actual.length === expected.length && correctPositions === expected.length,
    expected,
    actual,
    correctPositions,
  };
}
