import type { GraphScenario } from "./model";

export const ebikeMarketScenario: GraphScenario = {
  id: "ebike-supply-cost-shock-v1",
  title: "Weekly shared e-bike market",
  accessibleSummary:
    "A demand curve slopes down and a supply curve slopes up. Both can be shifted horizontally in one constrained step. Their intersection is the market equilibrium.",
  learningPurpose:
    "Test which market curve moves after a change in producers' costs and connect the shift to price and quantity.",
  xAxis: {
    label: "Quantity of rentals per week",
    shortLabel: "Quantity",
    unit: "rentals",
    domain: [0, 120],
    preferredTickCount: 6,
    format: "integer",
  },
  yAxis: {
    label: "Price per rental",
    shortLabel: "Price",
    unit: "dollars",
    domain: [0, 12],
    preferredTickCount: 6,
    format: "currency",
  },
  curves: [
    {
      id: "demand",
      label: "Demand",
      semanticRole: "buyers' willingness and ability to purchase",
      color: "#8b4ba3",
      equation: { kind: "linear", slope: -0.1, intercept: 12 },
      xDomain: [-40, 160],
      adjustable: true,
      shiftStep: 40,
    },
    {
      id: "supply",
      label: "Supply",
      semanticRole: "sellers' willingness and ability to offer",
      color: "#167268",
      equation: { kind: "linear", slope: 0.1, intercept: 0 },
      xDomain: [-40, 160],
      adjustable: true,
      shiftStep: 40,
    },
  ],
  equilibrium: { curveIds: ["demand", "supply"], label: "Equilibrium" },
  interaction: { snapValues: [-1, 0, 1], minimumHitTarget: 44 },
  style: {
    grid: "#dce4e0",
    axis: "#29413d",
    background: "#fbfcfb",
    equilibrium: "#c58a18",
  },
};

export const longLabelMarketScenario: GraphScenario = {
  ...ebikeMarketScenario,
  id: "long-label-resize-fixture",
  title: "Long-label responsive fixture",
  xAxis: {
    ...ebikeMarketScenario.xAxis,
    shortLabel: undefined,
    label:
      "Quantity of sustainably produced community transport journeys per week",
  },
  yAxis: {
    ...ebikeMarketScenario.yAxis,
    shortLabel: undefined,
    label: "Average inflation-adjusted price paid per journey",
  },
};

export const demandGrowthScenario: GraphScenario = {
  ...ebikeMarketScenario,
  id: "demand-growth-different-ranges-fixture",
  title: "Regional rail-pass market",
  accessibleSummary:
    "Demand and supply use a larger quantity range and a different price scale. Demand can shift after population growth.",
  xAxis: {
    label: "Monthly rail passes",
    shortLabel: "Passes",
    unit: "passes",
    domain: [0, 200],
    preferredTickCount: 5,
    format: "integer",
  },
  yAxis: {
    label: "Monthly pass price",
    shortLabel: "Price",
    unit: "dollars",
    domain: [0, 30],
    preferredTickCount: 5,
    format: "currency",
  },
  curves: [
    {
      id: "demand",
      label: "Demand",
      semanticRole: "rail-pass demand",
      color: "#8b4ba3",
      equation: { kind: "linear", slope: -0.12, intercept: 30 },
      xDomain: [-30, 230],
      adjustable: true,
      shiftStep: 30,
    },
    {
      id: "supply",
      label: "Supply",
      semanticRole: "rail-pass supply",
      color: "#167268",
      equation: { kind: "linear", slope: 0.08, intercept: 0 },
      xDomain: [-30, 230],
      adjustable: true,
      shiftStep: 30,
    },
  ],
};

export const priceControlScenario: GraphScenario = {
  ...ebikeMarketScenario,
  id: "price-control-annotation-fixture",
  title: "E-bike market with a maximum price",
  annotations: [
    {
      id: "maximum-price",
      kind: "horizontal-line",
      label: "Maximum price $4",
      x: 18,
      y: 4,
      priority: 10,
    },
  ],
};

export const productionPossibilityScenario: GraphScenario = {
  id: "ppf-point-curve-fixture",
  title: "Production possibility frontier",
  accessibleSummary:
    "A bowed production possibility frontier shows combinations of health services and education services.",
  learningPurpose:
    "Read opportunity cost from a non-linear point-defined curve.",
  xAxis: {
    label: "Education services",
    domain: [0, 100],
    preferredTickCount: 5,
    format: "integer",
  },
  yAxis: {
    label: "Health services",
    domain: [0, 100],
    preferredTickCount: 5,
    format: "integer",
  },
  curves: [
    {
      id: "ppf",
      label: "PPF",
      semanticRole: "maximum attainable combinations",
      color: "#167268",
      equation: {
        kind: "points",
        points: [
          { x: 0, y: 100 },
          { x: 25, y: 94 },
          { x: 50, y: 78 },
          { x: 75, y: 50 },
          { x: 100, y: 0 },
        ],
      },
    },
  ],
  interaction: { snapValues: [-1, 0, 1], minimumHitTarget: 44 },
  style: {
    grid: "#dce4e0",
    axis: "#29413d",
    background: "#fbfcfb",
    equilibrium: "#c58a18",
  },
};
