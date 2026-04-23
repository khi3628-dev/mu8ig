import { describe, it, expect, beforeEach } from "vitest";
import { useCartStore, cartSubtotalWon, lineTotalWon } from "../cartStore";

beforeEach(() => {
  useCartStore.setState({
    restaurantId: null,
    restaurantName: null,
    minOrderWon: 0,
    deliveryFeeWon: 0,
    lines: [],
  });
});

const R1 = {
  restaurantId: "r1",
  restaurantName: "가게1",
  minOrderWon: 15000,
  deliveryFeeWon: 3000,
};
const R2 = {
  restaurantId: "r2",
  restaurantName: "가게2",
  minOrderWon: 10000,
  deliveryFeeWon: 2000,
};

const L1 = {
  menuItemId: "m1",
  name: "후라이드",
  unitPriceWon: 20000,
  quantity: 1,
  options: [],
};

describe("cartStore", () => {
  it("adds a line and stores restaurant meta", () => {
    const res = useCartStore.getState().addLine({ ...R1, line: L1 });
    expect(res).toEqual({ ok: true });
    const s = useCartStore.getState();
    expect(s.lines).toHaveLength(1);
    expect(s.restaurantId).toBe("r1");
    expect(s.minOrderWon).toBe(15000);
  });

  it("rejects adding from a different restaurant", () => {
    useCartStore.getState().addLine({ ...R1, line: L1 });
    const res = useCartStore.getState().addLine({ ...R2, line: L1 });
    expect(res).toEqual({ ok: false, reason: "DIFFERENT_RESTAURANT" });
    expect(useCartStore.getState().lines).toHaveLength(1);
    expect(useCartStore.getState().restaurantId).toBe("r1");
  });

  it("force replace clears cart and starts new restaurant", () => {
    useCartStore.getState().addLine({ ...R1, line: L1 });
    useCartStore
      .getState()
      .forceReplaceRestaurant({ ...R2, line: { ...L1, unitPriceWon: 9000 } });
    const s = useCartStore.getState();
    expect(s.restaurantId).toBe("r2");
    expect(s.lines).toHaveLength(1);
    expect(s.lines[0].unitPriceWon).toBe(9000);
  });

  it("updateQuantity with 0 removes the line", () => {
    useCartStore.getState().addLine({ ...R1, line: L1 });
    const id = useCartStore.getState().lines[0].id;
    useCartStore.getState().updateQuantity(id, 0);
    expect(useCartStore.getState().lines).toHaveLength(0);
  });

  it("cartSubtotalWon sums all line totals", () => {
    useCartStore.getState().addLine({
      ...R1,
      line: { ...L1, unitPriceWon: 20000, quantity: 2 },
    });
    useCartStore.getState().addLine({
      ...R1,
      line: { ...L1, menuItemId: "m2", unitPriceWon: 4000, quantity: 3 },
    });
    const s = useCartStore.getState();
    expect(cartSubtotalWon(s.lines)).toBe(20000 * 2 + 4000 * 3);
  });

  it("lineTotalWon multiplies unit by quantity", () => {
    expect(
      lineTotalWon({
        id: "x",
        menuItemId: "m",
        name: "n",
        unitPriceWon: 100,
        quantity: 4,
        options: [],
      }),
    ).toBe(400);
  });
});
