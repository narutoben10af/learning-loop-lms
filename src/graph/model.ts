import type { Shift } from "../domain/activity";

export interface AxisSpec {
  label: string;
  shortLabel?: string;
  unit?: string;
  domain: [number, number];
  preferredTickCount: number;
  format: "integer" | "currency";
}

export type EquationSpec =
  | { kind: "linear"; slope: number; intercept: number }
  | { kind: "points"; points: Array<{ x: number; y: number }> };

export interface CurveSpec {
  id: string;
  label: string;
  semanticRole: string;
  color: string;
  dash?: string;
  equation: EquationSpec;
  xDomain?: [number, number];
  adjustable?: boolean;
  shiftStep?: number;
}

export interface AnnotationSpec {
  id: string;
  label: string;
  kind: "point" | "horizontal-line";
  x: number;
  y: number;
  priority: number;
}

export interface GraphScenario {
  id: string;
  title: string;
  accessibleSummary: string;
  learningPurpose: string;
  xAxis: AxisSpec;
  yAxis: AxisSpec;
  curves: CurveSpec[];
  equilibrium?: { curveIds: [string, string]; label: string };
  annotations?: AnnotationSpec[];
  interaction: {
    snapValues: Shift[];
    minimumHitTarget: number;
  };
  style: {
    grid: string;
    axis: string;
    background: string;
    equilibrium: string;
  };
}

export interface GraphState {
  shifts: Record<string, Shift>;
}

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GraphLayout {
  width: number;
  height: number;
  plot: Rect;
  xTicks: Array<{ value: number; x: number; label: string }>;
  yTicks: Array<{ value: number; y: number; label: string }>;
  curves: Array<{
    spec: CurveSpec;
    points: Point[];
    path: string;
    label: { x: number; y: number; rect: Rect };
    handle: Point;
  }>;
  equilibrium:
    | (Point & { xValue: number; yValue: number; label: string })
    | null;
  annotations: Array<{
    spec: AnnotationSpec;
    anchor: Point;
    label: { x: number; y: number; rect: Rect };
    line: { x1: number; x2: number; y1: number; y2: number } | null;
  }>;
  axisTitles: {
    x: { lines: string[]; x: number; y: number; lineHeight: number };
    y: { lines: string[]; x: number; y: number; lineHeight: number };
  };
  labelRects: Array<{ id: string; rect: Rect }>;
}

export type TextMeasure = (text: string, fontSize: number) => number;

export const approximateTextMeasure: TextMeasure = (text, fontSize) =>
  Math.max(fontSize, text.length * fontSize * 0.56);

function interpolatePoints(
  points: Array<{ x: number; y: number }>,
  x: number,
): number | null {
  if (points.length < 2) return null;
  const ordered = [...points].sort((a, b) => a.x - b.x);
  if (x < ordered[0].x || x > ordered[ordered.length - 1].x) return null;
  const rightIndex = ordered.findIndex((point) => point.x >= x);
  if (rightIndex === 0) return ordered[0].y;
  const left = ordered[rightIndex - 1];
  const right = ordered[rightIndex];
  if (right.x === left.x) return right.y;
  const ratio = (x - left.x) / (right.x - left.x);
  return left.y + ratio * (right.y - left.y);
}

export function evaluateCurve(
  curve: CurveSpec,
  x: number,
  shift: Shift = 0,
): number | null {
  const shiftedX = x - shift * (curve.shiftStep ?? 0);
  if (
    curve.xDomain &&
    (shiftedX < curve.xDomain[0] || shiftedX > curve.xDomain[1])
  )
    return null;
  if (curve.equation.kind === "linear") {
    return curve.equation.slope * shiftedX + curve.equation.intercept;
  }
  return interpolatePoints(curve.equation.points, shiftedX);
}

export function sampleCurve(
  curve: CurveSpec,
  axisDomain: [number, number],
  shift: Shift,
  samples = 80,
): Point[] {
  const [minimum, maximum] = axisDomain;
  return Array.from({ length: samples + 1 }, (_, index) => {
    const x = minimum + ((maximum - minimum) * index) / samples;
    return { x, y: evaluateCurve(curve, x, shift) };
  }).filter(
    (point): point is Point => point.y !== null && Number.isFinite(point.y),
  );
}

export function findIntersection(
  first: CurveSpec,
  second: CurveSpec,
  xDomain: [number, number],
  shifts: Record<string, Shift>,
): Point | null {
  const difference = (x: number) => {
    const firstY = evaluateCurve(first, x, shifts[first.id] ?? 0);
    const secondY = evaluateCurve(second, x, shifts[second.id] ?? 0);
    return firstY === null || secondY === null ? null : firstY - secondY;
  };
  const segments = 240;
  let left = xDomain[0];
  let leftDifference = difference(left);
  for (let index = 1; index <= segments; index += 1) {
    const right = xDomain[0] + ((xDomain[1] - xDomain[0]) * index) / segments;
    const rightDifference = difference(right);
    if (leftDifference !== null && rightDifference !== null) {
      if (Math.abs(leftDifference) < 1e-8) {
        const y = evaluateCurve(first, left, shifts[first.id] ?? 0);
        return y === null ? null : { x: left, y };
      }
      if (leftDifference * rightDifference <= 0) {
        let low = left;
        let high = right;
        for (let iteration = 0; iteration < 40; iteration += 1) {
          const middle = (low + high) / 2;
          const middleDifference = difference(middle);
          if (middleDifference === null) break;
          if (leftDifference * middleDifference <= 0) high = middle;
          else {
            low = middle;
            leftDifference = middleDifference;
          }
        }
        const x = (low + high) / 2;
        const y = evaluateCurve(first, x, shifts[first.id] ?? 0);
        return y === null ? null : { x, y };
      }
    }
    left = right;
    leftDifference = rightDifference;
  }
  return null;
}

export function formatAxisValue(axis: AxisSpec, value: number): string {
  const rounded =
    Math.abs(value - Math.round(value)) < 1e-8
      ? Math.round(value)
      : Number(value.toFixed(1));
  return axis.format === "currency" ? `$${rounded}` : `${rounded}`;
}

function makeTicks(domain: [number, number], count: number): number[] {
  return Array.from(
    { length: count + 1 },
    (_, index) => domain[0] + ((domain[1] - domain[0]) * index) / count,
  );
}

function wrapText(
  text: string,
  maximumWidth: number,
  fontSize: number,
  measureText: TextMeasure,
): string[] {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  for (const word of words) {
    const previous = lines.at(-1);
    const candidate = previous ? `${previous} ${word}` : word;
    if (previous && measureText(candidate, fontSize) > maximumWidth) {
      lines.push(word);
    } else if (previous) {
      lines[lines.length - 1] = candidate;
    } else {
      lines.push(word);
    }
  }
  return lines;
}

export function rectsOverlap(first: Rect, second: Rect, gap = 0): boolean {
  return !(
    first.x + first.width + gap <= second.x ||
    second.x + second.width + gap <= first.x ||
    first.y + first.height + gap <= second.y ||
    second.y + second.height + gap <= first.y
  );
}

function pointsToPath(points: Point[]): string {
  return points
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"}${point.x.toFixed(2)},${point.y.toFixed(2)}`,
    )
    .join(" ");
}

export function buildGraphLayout(
  scenario: GraphScenario,
  state: GraphState,
  width: number,
  height: number,
  measureText: TextMeasure = approximateTextMeasure,
): GraphLayout {
  const safeWidth = Math.max(280, width);
  const safeHeight = Math.max(360, height);
  const compact = safeWidth < 520;
  const xTickCount = Math.min(
    scenario.xAxis.preferredTickCount,
    compact ? 4 : 6,
  );
  const yTickCount = Math.min(
    scenario.yAxis.preferredTickCount,
    compact ? 4 : 6,
  );
  const yTickValues = makeTicks(scenario.yAxis.domain, yTickCount);
  const widestYTick = Math.max(
    ...yTickValues.map((value) =>
      measureText(formatAxisValue(scenario.yAxis, value), 12),
    ),
  );
  const top = 70;
  const right = compact ? 18 : 28;
  const bottom = compact ? 104 : 96;
  const provisionalPlotHeight = safeHeight - top - bottom;
  const yAxisText = compact
    ? (scenario.yAxis.shortLabel ?? scenario.yAxis.label)
    : scenario.yAxis.label;
  const yAxisLines = wrapText(
    yAxisText,
    provisionalPlotHeight - 16,
    12,
    measureText,
  );
  const left = Math.max(58, widestYTick + 38 + (yAxisLines.length - 1) * 14);
  const plot: Rect = {
    x: left,
    y: top,
    width: safeWidth - left - right,
    height: safeHeight - top - bottom,
  };
  const xScale = (value: number) =>
    plot.x +
    ((value - scenario.xAxis.domain[0]) /
      (scenario.xAxis.domain[1] - scenario.xAxis.domain[0])) *
      plot.width;
  const yScale = (value: number) =>
    plot.y +
    plot.height -
    ((value - scenario.yAxis.domain[0]) /
      (scenario.yAxis.domain[1] - scenario.yAxis.domain[0])) *
      plot.height;
  const xTicks = makeTicks(scenario.xAxis.domain, xTickCount).map((value) => ({
    value,
    x: xScale(value),
    label: formatAxisValue(scenario.xAxis, value),
  }));
  const yTicks = yTickValues.map((value) => ({
    value,
    y: yScale(value),
    label: formatAxisValue(scenario.yAxis, value),
  }));
  const xAxisText = compact
    ? (scenario.xAxis.shortLabel ?? scenario.xAxis.label)
    : scenario.xAxis.label;
  const xAxisLines = wrapText(
    xAxisText,
    Math.max(120, plot.width - 24),
    12,
    measureText,
  );
  const axisTitles: GraphLayout["axisTitles"] = {
    x: {
      lines: xAxisLines,
      x: plot.x + plot.width / 2,
      y: plot.y + plot.height + 46,
      lineHeight: 15,
    },
    y: {
      lines: yAxisLines,
      x: 18,
      y: plot.y + plot.height / 2,
      lineHeight: 14,
    },
  };
  const labelRects: Array<{ id: string; rect: Rect }> = [];
  const curves = scenario.curves.map((spec, curveIndex) => {
    const sampled = sampleCurve(
      spec,
      scenario.xAxis.domain,
      state.shifts[spec.id] ?? 0,
      compact ? 56 : 88,
    )
      .filter(
        (point) =>
          point.y >= scenario.yAxis.domain[0] &&
          point.y <= scenario.yAxis.domain[1],
      )
      .map((point) => ({ x: xScale(point.x), y: yScale(point.y) }));
    const anchor = sampled[
      Math.min(
        sampled.length - 1,
        Math.floor(sampled.length * (0.7 - curveIndex * 0.08)),
      )
    ] ?? { x: plot.x + plot.width / 2, y: plot.y + plot.height / 2 };
    const labelWidth = measureText(spec.label, 12) + 16;
    const labelHeight = 24;
    const candidates = [
      { x: anchor.x + 10, y: anchor.y - labelHeight - 8 },
      { x: anchor.x + 10, y: anchor.y + 8 },
      { x: anchor.x - labelWidth - 10, y: anchor.y - labelHeight - 8 },
      { x: anchor.x - labelWidth - 10, y: anchor.y + 8 },
    ];
    const chosen = candidates.find((candidate) => {
      const rect = { ...candidate, width: labelWidth, height: labelHeight };
      return (
        rect.x >= plot.x + 4 &&
        rect.x + rect.width <= plot.x + plot.width - 4 &&
        rect.y >= plot.y + 4 &&
        rect.y + rect.height <= plot.y + plot.height - 4 &&
        labelRects.every((placed) => !rectsOverlap(rect, placed.rect, 4))
      );
    }) ?? { x: plot.x + 8, y: plot.y + 8 + curveIndex * 30 };
    const rect = { ...chosen, width: labelWidth, height: labelHeight };
    labelRects.push({ id: `curve:${spec.id}`, rect });
    return {
      spec,
      points: sampled,
      path: pointsToPath(sampled),
      label: { x: rect.x + 8, y: rect.y + 16, rect },
      handle: anchor,
    };
  });

  let equilibrium: GraphLayout["equilibrium"] = null;
  if (scenario.equilibrium) {
    const [firstId, secondId] = scenario.equilibrium.curveIds;
    const first = scenario.curves.find((curve) => curve.id === firstId);
    const second = scenario.curves.find((curve) => curve.id === secondId);
    if (first && second) {
      const intersection = findIntersection(
        first,
        second,
        scenario.xAxis.domain,
        state.shifts,
      );
      if (
        intersection &&
        intersection.y >= scenario.yAxis.domain[0] &&
        intersection.y <= scenario.yAxis.domain[1]
      ) {
        equilibrium = {
          x: xScale(intersection.x),
          y: yScale(intersection.y),
          xValue: intersection.x,
          yValue: intersection.y,
          label: scenario.equilibrium.label,
        };
      }
    }
  }

  const annotations = [...(scenario.annotations ?? [])]
    .sort((first, second) => second.priority - first.priority)
    .map((spec, annotationIndex) => {
      const anchor = { x: xScale(spec.x), y: yScale(spec.y) };
      const labelWidth = Math.min(
        plot.width - 16,
        measureText(spec.label, 12) + 16,
      );
      const labelHeight = 24;
      const candidates = [
        { x: anchor.x + 10, y: anchor.y - labelHeight - 8 },
        { x: anchor.x + 10, y: anchor.y + 8 },
        { x: anchor.x - labelWidth - 10, y: anchor.y - labelHeight - 8 },
        { x: anchor.x - labelWidth - 10, y: anchor.y + 8 },
      ];
      const chosen = candidates.find((candidate) => {
        const rect = { ...candidate, width: labelWidth, height: labelHeight };
        const equilibriumRect = equilibrium
          ? {
              x: equilibrium.x - 12,
              y: equilibrium.y - 12,
              width: 24,
              height: 24,
            }
          : null;
        return (
          rect.x >= plot.x + 4 &&
          rect.x + rect.width <= plot.x + plot.width - 4 &&
          rect.y >= plot.y + 4 &&
          rect.y + rect.height <= plot.y + plot.height - 4 &&
          labelRects.every((placed) => !rectsOverlap(rect, placed.rect, 4)) &&
          (!equilibriumRect || !rectsOverlap(rect, equilibriumRect, 4))
        );
      }) ?? {
        x: plot.x + 8,
        y: plot.y + plot.height - 32 - annotationIndex * 28,
      };
      const rect = { ...chosen, width: labelWidth, height: labelHeight };
      labelRects.push({ id: `annotation:${spec.id}`, rect });
      return {
        spec,
        anchor,
        label: { x: rect.x + 8, y: rect.y + 16, rect },
        line:
          spec.kind === "horizontal-line"
            ? {
                x1: plot.x,
                x2: plot.x + plot.width,
                y1: anchor.y,
                y2: anchor.y,
              }
            : null,
      };
    });

  return {
    width: safeWidth,
    height: safeHeight,
    plot,
    xTicks,
    yTicks,
    curves,
    equilibrium,
    annotations,
    axisTitles,
    labelRects,
  };
}

export function validateScenario(scenario: GraphScenario): string[] {
  const errors: string[] = [];
  if (!scenario.id || !scenario.title || !scenario.accessibleSummary)
    errors.push("Scenario identity and accessible copy are required.");
  if (
    scenario.xAxis.domain[0] >= scenario.xAxis.domain[1] ||
    scenario.yAxis.domain[0] >= scenario.yAxis.domain[1]
  )
    errors.push("Axis domains must increase.");
  if (
    scenario.xAxis.preferredTickCount < 1 ||
    scenario.yAxis.preferredTickCount < 1
  )
    errors.push("Axis tick counts must be positive.");
  if (scenario.interaction.snapValues.length === 0)
    errors.push("At least one interaction snap value is required.");
  if (
    scenario.interaction.snapValues.some(
      (value, index, values) => index > 0 && value <= values[index - 1],
    )
  )
    errors.push("Interaction snap values must be unique and increasing.");
  if (scenario.interaction.minimumHitTarget < 44)
    errors.push("Interactive graph hit targets must be at least 44 pixels.");
  if (
    new Set(scenario.curves.map((curve) => curve.id)).size !==
    scenario.curves.length
  )
    errors.push("Curve IDs must be unique.");
  for (const curve of scenario.curves) {
    if (curve.adjustable && (!curve.shiftStep || curve.shiftStep <= 0))
      errors.push(
        `Adjustable curve ${curve.id} requires a positive shiftStep.`,
      );
    if (curve.equation.kind === "points" && curve.equation.points.length < 2)
      errors.push(`Point curve ${curve.id} requires at least two points.`);
    if (curve.xDomain && curve.xDomain[0] >= curve.xDomain[1])
      errors.push(`Curve ${curve.id} xDomain must increase.`);
  }
  if (
    scenario.equilibrium &&
    scenario.equilibrium.curveIds.some(
      (id) => !scenario.curves.some((curve) => curve.id === id),
    )
  )
    errors.push("Equilibrium references an unknown curve.");
  for (const annotation of scenario.annotations ?? []) {
    if (
      annotation.x < scenario.xAxis.domain[0] ||
      annotation.x > scenario.xAxis.domain[1] ||
      annotation.y < scenario.yAxis.domain[0] ||
      annotation.y > scenario.yAxis.domain[1]
    )
      errors.push(`Annotation ${annotation.id} is outside the axis domains.`);
  }
  if (
    new Set((scenario.annotations ?? []).map((annotation) => annotation.id))
      .size !== (scenario.annotations ?? []).length
  )
    errors.push("Annotation IDs must be unique.");
  return errors;
}
