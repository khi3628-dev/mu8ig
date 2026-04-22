import { z } from "zod";
import type { GameDef } from "./registry";

const digitsPattern = /^\d+$/;

export function digitsSchema(length: number) {
  return z
    .string()
    .length(length)
    .regex(digitsPattern, "숫자만 입력 가능합니다");
}

export function selectionSchemaForGame(game: GameDef) {
  switch (game.kind) {
    case "FOUR_D":
      return z.object({ digits: digitsSchema(4) });
    case "FOUR_D_JACKPOT":
      return z.object({
        digitsA: digitsSchema(4),
        digitsB: digitsSchema(4),
      });
    case "FIVE_D":
      return z.object({ digits: digitsSchema(5) });
    case "SIX_D":
      return z.object({ digits: digitsSchema(6) });
    case "PICK_N_OF_M": {
      const pool = game.poolSize ?? 50;
      const n = game.pickCount ?? 6;
      return z.object({
        numbers: z
          .array(z.number().int().min(1).max(pool))
          .length(n)
          .refine(
            (arr) => new Set(arr).size === arr.length,
            "중복된 번호가 있습니다",
          ),
      });
    }
  }
}
