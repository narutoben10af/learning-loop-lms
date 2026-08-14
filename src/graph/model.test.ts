import { describe, expect, it } from "vitest";
import {
  buildGraphLayout,
  findIntersection,
  rectsOverlap,
  validateScenario,
} from "./model";
import {
  demandGrowthScenario,
  ebikeMarketScenario,
  longLabelMarketScenario,
  priceControlScenario,
  productionPossibilityScenario,
} from "./scenarios";

describe("data-driven Economics graph model", () => {
  it("validates each supported scenario configuration", () => {
    expect(validateScenario(ebikeMarketScenario)).toEqual([]);
    expect(validateScenario(longLabelMarketScenario)).toEqual([]);
    expect(validateScenario(demandGrowthScenario)).toEqual([]);
    expect(validateScenario(priceControlScenario)).toEqual([]);
    expect(validateScenario(productionPossibilityScenario)).toEqual([]);

    expect(
      validateScenario({
        ...ebikeMarketScenario,
        xAxis: { ...ebikeMarketScenario.xAxis, domain: [10, 10] },
      }),
    ).toContain("Axis domains must increase.");
    expect(
      validateScenario({
        ...ebikeMarketScenario,
        interaction: {
          ...ebikeMarketScenario.interaction,
          snapValues: [0, -1, 1],
          minimumHitTarget: 20,
        },
      }),
    ).toEqual(
      expect.arrayContaining([
        "Interaction snap values must be unique and increasing.",
        "Interactive graph hit targets must be at least 44 pixels.",
      ]),
    );
  });

  it.each([
    [{ demand: 0, supply: 0 }, 60, 6],
    [{ demand: 0, supply: 1 }, 80, 4],
    [{ demand: 1, supply: 0 }, 80, 8],
  ] as const)(
    "recalculates equilibrium from scenario state %o",
    (shifts, expectedQuantity, expectedPrice) => {
      const [demand, supply] = ebikeMarketScenario.curves;
      const intersection = findIntersection(
        demand,
        supply,
        ebikeMarketScenario.xAxis.domain,
        shifts,
      );
      expect(intersection?.x).toBeCloseTo(expectedQuantity, 4);
      expect(intersection?.y).toBeCloseTo(expectedPrice, 4);
    },
  );

  it.each([
    [320, 430],
    [768, 500],
    [1100, 500],
  ])("generates contained geometry at %ipx", (width, height) => {
    const layout = buildGraphLayout(
      longLabelMarketScenario,
      { shifts: { demand: 0, supply: 1 } },
      width,
      height,
    );

    expect(layout.width).toBe(width);
    expect(layout.plot.x).toBeGreaterThan(0);
    expect(layout.plot.x + layout.plot.width).toBeLessThanOrEqual(width);
    expect(layout.plot.y + layout.plot.height).toBeLessThan(height);
    expect(layout.xTicks).toHaveLength(width < 520 ? 5 : 7);
    expect(layout.curves.every((curve) => curve.path.startsWith("M"))).toBe(
      true,
    );
    if (width === 320) {
      expect(layout.axisTitles.x.lines.length).toBeGreaterThan(1);
      expect(layout.axisTitles.y.lines.length).toBeGreaterThan(1);
    }
    for (const { rect } of layout.labelRects) {
      expect(rect.x).toBeGreaterThanOrEqual(layout.plot.x);
      expect(rect.y).toBeGreaterThanOrEqual(layout.plot.y);
      expect(rect.x + rect.width).toBeLessThanOrEqual(
        layout.plot.x + layout.plot.width,
      );
      expect(rect.y + rect.height).toBeLessThanOrEqual(
        layout.plot.y + layout.plot.height,
      );
    }
    for (let first = 0; first < layout.labelRects.length; first += 1) {
      for (
        let second = first + 1;
        second < layout.labelRects.length;
        second += 1
      ) {
        expect(
          rectsOverlap(
            layout.labelRects[first].rect,
            layout.labelRects[second].rect,
            4,
          ),
        ).toBe(false);
      }
    }
  });

  it("renders a point-generated PPF without assuming an equilibrium", () => {
    const layout = buildGraphLayout(
      productionPossibilityScenario,
      { shifts: {} },
      640,
      460,
    );

    expect(layout.curves).toHaveLength(1);
    expect(layout.curves[0].points.length).toBeGreaterThan(20);
    expect(layout.equilibrium).toBeNull();
  });

  it("renders different ranges and scenario-authored annotations", () => {
    const demandLayout = buildGraphLayout(
      demandGrowthScenario,
      { shifts: { demand: 1, supply: 0 } },
      720,
      500,
    );
    const controlLayout = buildGraphLayout(
      priceControlScenario,
      { shifts: { demand: 0, supply: 0 } },
      720,
      500,
    );

    expect(demandLayout.xTicks.at(-1)?.value).toBe(200);
    expect(demandLayout.yTicks.at(-1)?.value).toBe(30);
    expect(demandLayout.equilibrium?.xValue).toBeCloseTo(168, 4);
    expect(demandLayout.equilibrium?.yValue).toBeCloseTo(13.44, 4);
    expect(controlLayout.annotations).toHaveLength(1);
    expect(controlLayout.annotations[0].line?.y1).toBe(
      controlLayout.annotations[0].line?.y2,
    );
    expect(
      controlLayout.labelRects.some(({ id }) => id.includes("maximum-price")),
    ).toBe(true);
  });
});
