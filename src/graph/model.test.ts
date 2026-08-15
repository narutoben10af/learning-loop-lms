import { describe, expect, it } from "vitest";
import {
  buildGraphLayout,
  CURVE_HANDLE_HEIGHT,
  CURVE_HANDLE_WIDTH,
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
  const handleRect = (curve: { handle: { x: number; y: number } }) => ({
    x: curve.handle.x - CURVE_HANDLE_WIDTH / 2,
    y: curve.handle.y - CURVE_HANDLE_HEIGHT / 2,
    width: CURVE_HANDLE_WIDTH,
    height: CURVE_HANDLE_HEIGHT,
  });

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
    ).toContain("Axis domains must contain finite increasing values.");
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
        "Interaction snap values must be finite, unique, and increasing.",
        "Interactive graph hit targets must be at least 44 pixels.",
      ]),
    );
  });

  it("rejects non-finite geometry and false same-curve equilibria", () => {
    const invalid = validateScenario({
      ...ebikeMarketScenario,
      xAxis: {
        ...ebikeMarketScenario.xAxis,
        domain: [Number.NaN, 120],
        preferredTickCount: Number.NaN,
      },
      curves: ebikeMarketScenario.curves.map((curve, index) =>
        index === 0
          ? {
              ...curve,
              equation: {
                kind: "linear" as const,
                slope: Number.NaN,
                intercept: 12,
              },
            }
          : curve,
      ),
      equilibrium: { curveIds: ["demand", "demand"], label: "Equilibrium" },
    });

    expect(invalid).toEqual(
      expect.arrayContaining([
        "Axis domains must contain finite increasing values.",
        "Axis tick counts must be positive integers.",
        "Linear curve demand requires finite coefficients.",
        "Equilibrium must reference two distinct curves.",
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

  it("retains shifted-curve and equilibrium baselines from declarative state", () => {
    const unchanged = buildGraphLayout(
      ebikeMarketScenario,
      { shifts: { demand: 0, supply: 0 } },
      375,
      430,
    );
    expect(unchanged.baselineEquilibrium).toBeNull();
    expect(unchanged.curves.every((curve) => curve.baselinePath === null)).toBe(
      true,
    );

    const shifted = buildGraphLayout(
      ebikeMarketScenario,
      { shifts: { demand: 0, supply: 1 } },
      375,
      430,
    );
    expect(
      shifted.curves.find((curve) => curve.spec.id === "demand")?.baselinePath,
    ).toBeNull();
    expect(
      shifted.curves.find((curve) => curve.spec.id === "supply")?.baselinePath,
    ).toMatch(/^M/);
    expect(shifted.baselineEquilibrium?.xValue).toBeCloseTo(60, 4);
    expect(shifted.baselineEquilibrium?.yValue).toBeCloseTo(6, 4);
    expect(shifted.equilibrium?.xValue).toBeCloseTo(80, 4);
    expect(shifted.equilibrium?.yValue).toBeCloseTo(4, 4);
  });

  it.each([
    [254, 430],
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
    expect(layout.plot.height).toBeGreaterThan(120);
    expect(layout.xTicks).toHaveLength(width < 520 ? 5 : 7);
    expect(layout.curves.every((curve) => curve.path.startsWith("M"))).toBe(
      true,
    );
    if (width <= 320) {
      expect(layout.axisTitles.x.lines.length).toBeGreaterThan(1);
    }
    expect(layout.axisTitles.x.rect.x).toBeGreaterThanOrEqual(0);
    expect(
      layout.axisTitles.x.rect.y + layout.axisTitles.x.rect.height,
    ).toBeLessThanOrEqual(height);
    expect(layout.axisTitles.y.rect.x).toBeGreaterThanOrEqual(0);
    expect(
      layout.axisTitles.y.rect.y + layout.axisTitles.y.rect.height,
    ).toBeLessThanOrEqual(height);
    expect(rectsOverlap(layout.equilibriumBanner, layout.plot, 4)).toBe(false);
    for (const tick of layout.xTicks) {
      expect(rectsOverlap(tick.rect, layout.plot)).toBe(false);
    }
    for (const tick of layout.yTicks) {
      expect(rectsOverlap(tick.rect, layout.plot)).toBe(false);
    }
    for (const item of layout.legend.items) {
      expect(item.rect.x).toBeGreaterThanOrEqual(layout.plot.x);
      expect(item.rect.x + item.rect.width).toBeLessThanOrEqual(
        layout.plot.x + layout.plot.width,
      );
      expect(item.rect.y + item.rect.height).toBeLessThanOrEqual(height);
      expect(rectsOverlap(item.rect, layout.axisTitles.x.rect, 4)).toBe(false);
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
      for (const curve of layout.curves) {
        expect(
          rectsOverlap(
            rect,
            {
              x: curve.handle.x - CURVE_HANDLE_WIDTH / 2,
              y: curve.handle.y - CURVE_HANDLE_HEIGHT / 2,
              width: CURVE_HANDLE_WIDTH,
              height: CURVE_HANDLE_HEIGHT,
            },
            2,
          ),
        ).toBe(false);
      }
      if (layout.equilibrium) {
        expect(
          rectsOverlap(
            rect,
            {
              x: layout.equilibrium.x - 11,
              y: layout.equilibrium.y - 11,
              width: 22,
              height: 22,
            },
            2,
          ),
        ).toBe(false);
      }
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

  it("wraps long curve and annotation labels into collision-tested bounds", () => {
    const scenario = {
      ...priceControlScenario,
      curves: priceControlScenario.curves.map((curve) => ({
        ...curve,
        label: `${curve.label} for sustainably produced community transport journeys`,
      })),
      annotations: [
        {
          ...priceControlScenario.annotations![0],
          label:
            "Maximum inflation-adjusted price permitted for every community journey",
        },
      ],
    };
    const layout = buildGraphLayout(
      scenario,
      { shifts: { demand: 0, supply: 0 } },
      320,
      500,
    );

    expect(layout.curves.every((curve) => curve.label.lines.length > 1)).toBe(
      true,
    );
    expect(layout.annotations[0].label.lines.length).toBeGreaterThan(1);
    for (const { rect } of layout.labelRects) {
      expect(rect.x).toBeGreaterThanOrEqual(layout.plot.x);
      expect(rect.x + rect.width).toBeLessThanOrEqual(
        layout.plot.x + layout.plot.width,
      );
      expect(rect.y).toBeGreaterThanOrEqual(layout.plot.y);
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

  it("reserves SVG gutters for wide endpoint tick labels", () => {
    const scenario = {
      ...ebikeMarketScenario,
      xAxis: {
        ...ebikeMarketScenario.xAxis,
        domain: [0, 1_000_000_000] as [number, number],
      },
    };
    const layout = buildGraphLayout(
      scenario,
      { shifts: { demand: 0, supply: 0 } },
      320,
      430,
    );

    for (const tick of layout.xTicks) {
      expect(tick.rect.x).toBeGreaterThanOrEqual(0);
      expect(tick.rect.x + tick.rect.width).toBeLessThanOrEqual(layout.width);
    }
  });

  it.each([ebikeMarketScenario, longLabelMarketScenario, demandGrowthScenario])(
    "keeps adjustment handles distinct from the market result for %s",
    (scenario) => {
      for (const demand of scenario.interaction.snapValues) {
        for (const supply of scenario.interaction.snapValues) {
          for (const width of [320, 375, 720]) {
            const layout = buildGraphLayout(
              scenario,
              { shifts: { demand, supply } },
              width,
              width < 520 ? 430 : 500,
            );
            const handles = layout.curves
              .filter((curve) => curve.spec.adjustable)
              .map(handleRect);
            for (const rect of handles) {
              expect(rect.x).toBeGreaterThanOrEqual(layout.plot.x + 4);
              expect(rect.y).toBeGreaterThanOrEqual(layout.plot.y + 4);
              expect(rect.x + rect.width).toBeLessThanOrEqual(
                layout.plot.x + layout.plot.width - 4,
              );
              expect(rect.y + rect.height).toBeLessThanOrEqual(
                layout.plot.y + layout.plot.height - 4,
              );
            }
            for (let first = 0; first < handles.length; first += 1) {
              for (
                let second = first + 1;
                second < handles.length;
                second += 1
              ) {
                expect(rectsOverlap(handles[first], handles[second], 4)).toBe(
                  false,
                );
              }
            }
            if (layout.equilibrium) {
              const equilibriumRect = {
                x: layout.equilibrium.x - 12,
                y: layout.equilibrium.y - 12,
                width: 24,
                height: 24,
              };
              for (const rect of handles) {
                expect(rectsOverlap(rect, equilibriumRect, 4)).toBe(false);
              }
            }
            if (layout.baselineEquilibrium) {
              const baselineRect = {
                x: layout.baselineEquilibrium.x - 12,
                y: layout.baselineEquilibrium.y - 12,
                width: 24,
                height: 24,
              };
              for (const rect of handles) {
                expect(rectsOverlap(rect, baselineRect, 4)).toBe(false);
              }
            }
          }
        }
      }
    },
  );

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
