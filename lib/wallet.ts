import type { Prisma } from "@prisma/client";

export interface WalletMutation {
  userId: string;
  type:
    | "DEPOSIT"
    | "WITHDRAWAL"
    | "BET_DEBIT"
    | "BET_CREDIT_WIN"
    | "REFUND"
    | "ADJUSTMENT";
  amountSen: number; // signed: deposits positive, debits negative
  referenceType?: string;
  referenceId?: string;
  stripePaymentIntentId?: string;
}

/**
 * Mutate a user's wallet inside a Prisma transaction. Requires the transaction
 * client `tx` so callers can compose larger atomic operations (e.g. place bet
 * = debit + insert Bet).
 *
 * Returns the user's new balance.
 */
export async function mutateWallet(
  tx: Prisma.TransactionClient,
  m: WalletMutation,
): Promise<{ balanceAfterSen: number }> {
  const user = await tx.user.findUnique({
    where: { id: m.userId },
    select: { walletBalanceSen: true },
  });
  if (!user) throw new Error("USER_NOT_FOUND");

  const balanceAfterSen = user.walletBalanceSen + m.amountSen;
  if (balanceAfterSen < 0) throw new Error("INSUFFICIENT_FUNDS");

  await tx.user.update({
    where: { id: m.userId },
    data: { walletBalanceSen: balanceAfterSen },
  });

  await tx.transaction.create({
    data: {
      userId: m.userId,
      type: m.type,
      amountSen: m.amountSen,
      balanceAfterSen,
      referenceType: m.referenceType ?? null,
      referenceId: m.referenceId ?? null,
      stripePaymentIntentId: m.stripePaymentIntentId ?? null,
    },
  });

  return { balanceAfterSen };
}
