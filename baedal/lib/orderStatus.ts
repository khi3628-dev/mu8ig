export const ORDER_STATUSES = [
  "PENDING",
  "ACCEPTED",
  "COOKING",
  "DELIVERING",
  "DELIVERED",
  "CANCELLED",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: "접수 대기",
  ACCEPTED: "주문 접수",
  COOKING: "조리 중",
  DELIVERING: "배달 중",
  DELIVERED: "배달 완료",
  CANCELLED: "주문 취소",
};

// Simulated timing (seconds since placedAt) — compressed for demo.
// PENDING: 0-20s, ACCEPTED: 20-60s, COOKING: 60-180s, DELIVERING: 180-360s, DELIVERED: 360s+
const STAGE_BOUNDARIES_SEC: Array<{ at: number; status: OrderStatus }> = [
  { at: 0, status: "PENDING" },
  { at: 20, status: "ACCEPTED" },
  { at: 60, status: "COOKING" },
  { at: 180, status: "DELIVERING" },
  { at: 360, status: "DELIVERED" },
];

export const SIMULATED_TOTAL_SEC = 360;

/**
 * Compute the simulated live status for a non-cancelled order given when it
 * was placed and the current time. Status never regresses; if the order was
 * already CANCELLED or explicitly DELIVERED in the DB, the caller should
 * preserve that.
 */
export function computeLiveStatus(
  placedAt: Date,
  now: Date = new Date(),
): OrderStatus {
  const elapsedSec = Math.max(
    0,
    Math.floor((now.getTime() - placedAt.getTime()) / 1000),
  );
  let current: OrderStatus = "PENDING";
  for (const b of STAGE_BOUNDARIES_SEC) {
    if (elapsedSec >= b.at) current = b.status;
  }
  return current;
}

export function estimatedArrival(placedAt: Date): Date {
  return new Date(placedAt.getTime() + SIMULATED_TOTAL_SEC * 1000);
}

export function isTerminal(status: OrderStatus): boolean {
  return status === "DELIVERED" || status === "CANCELLED";
}
