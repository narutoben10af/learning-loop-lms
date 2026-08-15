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

/** Visual footprint reserved for the labeled curve-adjustment affordance. */
export const CURVE_HANDLE_WIDTH = 64;
export const CURVE_HANDLE_HEIGHT = 28;

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

export type EquilibriumLayout = Point & {
  xValue: number;
  yValue: number;
  label: string;
};

export interface GraphLayout {
  width: number;
  height: number;
  plot: Rect;
  xTicks: Array<{ value: number; x: number; label: string; rect: Rect }>;
  yTicks: Array<{ value: number; y: number; label: string; rect: Rect }>;
  curves: Array<{
    spec: CurveSpec;
    points: Point[];
    path: string;
    baselinePath: string | null;
    label: {
      x: number;
      y: number;
      rect: Rect;
      lines: string[];
      lineHeight: number;
    };
    handle: Point;
  }>;
  equilibrium: EquilibriumLayout | null;
  baselineEquilibrium: EquilibriumLayout | null;
  annotations: Array<{
    spec: AnnotationSpec;
    anchor: Point;
    label: {
      x: number;
      y: number;
      rect: Rect;
      lines: string[];
      lineHeight: number;
    };
    line: { x1: number; x2: number; y1: number; y2: number } | null;
  }>;
  axisTitles: {
    x: {
      lines: string[];
      x: number;
      y: number;
      lineHeight: number;
      rect: Rect;
    };
    y: {
      lines: string[];
      x: number;
      y: number;
      lineHeight: number;
      rect: Rect;
    };
  };
  equilibriumBanner: Rect;
  legend: {
    items: Array<{
      curveId: string;
      label: string;
      lines: string[];
      x: number;
      y: number;
      lineHeight: number;
      rect: Rect;
    }>;
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
  const words = text
    .trim()
    .split(/\s+/)
    .flatMap((word) => {
      if (measureText(word, fontSize) <= maximumWidth) return [word];
      const chunks: string[] = [];
      let chunk = "";
      for (const character of word) {
        if (
          chunk &&
          measureText(`${chunk}${character}`, fontSize) > maximumWidth
        ) {
          chunks.push(chunk);
          chunk = character;
        } else {
          chunk += character;
        }
      }
      if (chunk) chunks.push(chunk);
      return chunks;
    });
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

class LabelPlacementError extends Error {}

function curveHandleRect(point: Point): Rect {
  return {
    x: point.x - CURVE_HANDLE_WIDTH / 2,
    y: point.y - CURVE_HANDLE_HEIGHT / 2,
    width: CURVE_HANDLE_WIDTH,
    height: CURVE_HANDLE_HEIGHT,
  };
}

function chooseHandleAnchor(
  curve: { points: Point[]; preferredHandle: Point },
  plot: Rect,
  forbidden: Rect[],
): Point {
  const clampToHandleSafePlot = (point: Point): Point => ({
    x: Math.min(
      plot.x + plot.width - CURVE_HANDLE_WIDTH / 2 - 4,
      Math.max(plot.x + CURVE_HANDLE_WIDTH / 2 + 4, point.x),
    ),
    y: Math.min(
      plot.y + plot.height - CURVE_HANDLE_HEIGHT / 2 - 4,
      Math.max(plot.y + CURVE_HANDLE_HEIGHT / 2 + 4, point.y),
    ),
  });
  const preferredIndex = curve.points.reduce(
    (closestIndex, point, index, points) => {
      const closest = points[closestIndex] ?? curve.preferredHandle;
      const preferredDistance =
        Math.abs(point.x - curve.preferredHandle.x) +
        Math.abs(point.y - curve.preferredHandle.y);
      const closestDistance =
        Math.abs(closest.x - curve.preferredHandle.x) +
        Math.abs(closest.y - curve.preferredHandle.y);
      return preferredDistance < closestDistance ? index : closestIndex;
    },
    0,
  );
  const candidates = [
    clampToHandleSafePlot(curve.preferredHandle),
    ...curve.points
      .map((point, index) => ({ point, index }))
      .sort(
        (first, second) =>
          Math.abs(first.index - preferredIndex) -
          Math.abs(second.index - preferredIndex),
      )
      .map(({ point }) => clampToHandleSafePlot(point)),
  ];
  const isAvailable = (point: Point) => {
    const rect = curveHandleRect(point);
    return (
      rect.x >= plot.x + 4 &&
      rect.x + rect.width <= plot.x + plot.width - 4 &&
      rect.y >= plot.y + 4 &&
      rect.y + rect.height <= plot.y + plot.height - 4 &&
      forbidden.every((other) => !rectsOverlap(rect, other, 4))
    );
  };
  const chosen = candidates.find(isAvailable);
  if (chosen) return chosen;
  throw new LabelPlacementError(
    "No collision-free graph adjustment handle position.",
  );
}

function placeLabel(
  plot: Rect,
  width: number,
  height: number,
  preferred: Array<{ x: number; y: number }>,
  forbidden: Rect[],
): Rect {
  const isAvailable = (candidate: { x: number; y: number }) => {
    const rect = { ...candidate, width, height };
    return (
      rect.x >= plot.x + 4 &&
      rect.x + rect.width <= plot.x + plot.width - 4 &&
      rect.y >= plot.y + 4 &&
      rect.y + rect.height <= plot.y + plot.height - 4 &&
      forbidden.every((other) => !rectsOverlap(rect, other, 4))
    );
  };
  const gridCandidates: Array<{ x: number; y: number }> = [];
  for (
    let y = plot.y + 6;
    y + height <= plot.y + plot.height - 4;
    y += Math.max(18, height + 6)
  ) {
    for (
      let x = plot.x + 6;
      x + width <= plot.x + plot.width - 4;
      x += Math.max(24, Math.min(width + 6, plot.width / 3))
    ) {
      gridCandidates.push({ x, y });
    }
  }
  const chosen = [...preferred, ...gridCandidates].find(isAvailable);
  if (chosen) return { ...chosen, width, height };
  throw new LabelPlacementError("No collision-free graph label position.");
}

function pointsToPath(points: Point[]): string {
  return points
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"}${point.x.toFixed(2)},${point.y.toFixed(2)}`,
    )
    .join(" ");
}

function buildGraphLayoutAtHeight(
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
  const firstXTickWidth = measureText(
    formatAxisValue(scenario.xAxis, scenario.xAxis.domain[0]),
    12,
  );
  const lastXTickWidth = measureText(
    formatAxisValue(scenario.xAxis, scenario.xAxis.domain[1]),
    12,
  );
  const right = Math.max(compact ? 18 : 28, lastXTickWidth / 2 + 5);
  const minimumBottom = compact ? 104 : 96;
  const provisionalPlotHeight = safeHeight - top - minimumBottom;
  const yAxisText = compact
    ? (scenario.yAxis.shortLabel ?? scenario.yAxis.label)
    : scenario.yAxis.label;
  const yAxisLines = wrapText(
    yAxisText,
    provisionalPlotHeight - 16,
    12,
    measureText,
  );
  const yAxisGutter = Math.max(14, yAxisLines.length * 14);
  const left = Math.max(
    58,
    firstXTickWidth / 2 + 5,
    widestYTick + 22 + yAxisGutter,
  );
  const provisionalPlotWidth = safeWidth - left - right;
  const xAxisText = compact
    ? (scenario.xAxis.shortLabel ?? scenario.xAxis.label)
    : scenario.xAxis.label;
  const xAxisLines = wrapText(
    xAxisText,
    Math.max(100, provisionalPlotWidth - 24),
    12,
    measureText,
  );
  const legendMaximumLabelWidth = compact ? 96 : 142;
  const legendPlans = scenario.curves.map((curve) => {
    const lines = wrapText(
      curve.label,
      legendMaximumLabelWidth,
      12,
      measureText,
    );
    const labelWidth = Math.max(...lines.map((line) => measureText(line, 12)));
    return {
      curveId: curve.id,
      label: curve.label,
      lines,
      width: Math.min(provisionalPlotWidth, labelWidth + 39),
      height: Math.max(18, lines.length * 14),
      row: 0,
      offsetX: 0,
    };
  });
  let legendRow = 0;
  let legendCursor = 0;
  const legendRowHeights: number[] = [];
  for (const item of legendPlans) {
    if (legendCursor > 0 && legendCursor + item.width > provisionalPlotWidth) {
      legendRow += 1;
      legendCursor = 0;
    }
    item.row = legendRow;
    item.offsetX = legendCursor;
    legendCursor += item.width + 12;
    legendRowHeights[legendRow] = Math.max(
      legendRowHeights[legendRow] ?? 0,
      item.height,
    );
  }
  const legendHeight =
    legendRowHeights.reduce((sum, rowHeight) => sum + rowHeight, 0) +
    Math.max(0, legendRowHeights.length - 1) * 7;
  const axisLastBaselineOffset = 46 + (xAxisLines.length - 1) * 15;
  const bottom = Math.max(
    minimumBottom,
    axisLastBaselineOffset + 26 + legendHeight + 12,
  );
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
  const xTicks = makeTicks(scenario.xAxis.domain, xTickCount).map((value) => {
    const label = formatAxisValue(scenario.xAxis, value);
    const tickX = xScale(value);
    const labelWidth = measureText(label, 12);
    return {
      value,
      x: tickX,
      label,
      rect: {
        x: tickX - labelWidth / 2,
        y: plot.y + plot.height + 8,
        width: labelWidth,
        height: 16,
      },
    };
  });
  const yTicks = yTickValues.map((value) => {
    const label = formatAxisValue(scenario.yAxis, value);
    const tickY = yScale(value);
    const labelWidth = measureText(label, 12);
    return {
      value,
      y: tickY,
      label,
      rect: {
        x: plot.x - 11 - labelWidth,
        y: tickY - 7,
        width: labelWidth,
        height: 14,
      },
    };
  });
  const xAxisLongestLine = Math.max(
    ...xAxisLines.map((line) => measureText(line, 12)),
  );
  const yAxisLongestLine = Math.max(
    ...yAxisLines.map((line) => measureText(line, 12)),
  );
  const axisTitles: GraphLayout["axisTitles"] = {
    x: {
      lines: xAxisLines,
      x: plot.x + plot.width / 2,
      y: plot.y + plot.height + 46,
      lineHeight: 15,
      rect: {
        x: plot.x + plot.width / 2 - xAxisLongestLine / 2,
        y: plot.y + plot.height + 34,
        width: xAxisLongestLine,
        height: xAxisLines.length * 15,
      },
    },
    y: {
      lines: yAxisLines,
      x: 8 + yAxisGutter / 2,
      y: plot.y + plot.height / 2,
      lineHeight: 14,
      rect: {
        x: 8,
        y: plot.y + plot.height / 2 - yAxisLongestLine / 2,
        width: yAxisGutter,
        height: yAxisLongestLine,
      },
    },
  };
  const equilibriumBanner: Rect = {
    x: plot.x,
    y: 6,
    width: Math.min(250, plot.width),
    height: 58,
  };
  const hasShift = scenario.curves.some(
    (curve) => (state.shifts[curve.id] ?? 0) !== 0,
  );
  const rawCurves = scenario.curves.map((spec, curveIndex) => {
    const shift = state.shifts[spec.id] ?? 0;
    const sampled = sampleCurve(
      spec,
      scenario.xAxis.domain,
      shift,
      compact ? 56 : 88,
    )
      .filter(
        (point) =>
          point.y >= scenario.yAxis.domain[0] &&
          point.y <= scenario.yAxis.domain[1],
      )
      .map((point) => ({ x: xScale(point.x), y: yScale(point.y) }));
    const baselinePoints =
      shift === 0
        ? []
        : sampleCurve(spec, scenario.xAxis.domain, 0, compact ? 56 : 88)
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
    return {
      spec,
      points: sampled,
      path: pointsToPath(sampled),
      baselinePath:
        baselinePoints.length > 0 ? pointsToPath(baselinePoints) : null,
      preferredHandle: anchor,
    };
  });

  const layoutEquilibrium = (
    shifts: Record<string, Shift>,
  ): EquilibriumLayout | null => {
    if (!scenario.equilibrium) return null;
    const [firstId, secondId] = scenario.equilibrium.curveIds;
    const first = scenario.curves.find((curve) => curve.id === firstId);
    const second = scenario.curves.find((curve) => curve.id === secondId);
    if (first && second) {
      const intersection = findIntersection(
        first,
        second,
        scenario.xAxis.domain,
        shifts,
      );
      if (
        intersection &&
        intersection.y >= scenario.yAxis.domain[0] &&
        intersection.y <= scenario.yAxis.domain[1]
      ) {
        return {
          x: xScale(intersection.x),
          y: yScale(intersection.y),
          xValue: intersection.x,
          yValue: intersection.y,
          label: scenario.equilibrium.label,
        };
      }
    }
    return null;
  };
  const equilibrium = layoutEquilibrium(state.shifts);
  const baselineEquilibrium = hasShift ? layoutEquilibrium({}) : null;

  const equilibriumRects = [equilibrium, baselineEquilibrium]
    .filter((point): point is EquilibriumLayout => point !== null)
    .map((point) => ({
      x: point.x - 12,
      y: point.y - 12,
      width: 24,
      height: 24,
    }));
  const occupiedHandleRects: Rect[] = [...equilibriumRects];
  const positionedCurves = rawCurves.map((curve) => {
    const handle = curve.spec.adjustable
      ? chooseHandleAnchor(curve, plot, occupiedHandleRects)
      : curve.preferredHandle;
    if (curve.spec.adjustable)
      occupiedHandleRects.push(curveHandleRect(handle));
    return { ...curve, handle };
  });
  const handleRects = positionedCurves
    .filter((curve) => curve.spec.adjustable)
    .map((curve) => curveHandleRect(curve.handle));
  const labelRects: Array<{ id: string; rect: Rect }> = [];
  const curves = positionedCurves.map((curve) => {
    const maximumLabelWidth = Math.max(
      68,
      Math.min(compact ? 132 : 180, plot.width * 0.58),
    );
    const lines = wrapText(
      curve.spec.label,
      maximumLabelWidth - 16,
      12,
      measureText,
    );
    const labelWidth =
      Math.max(...lines.map((line) => measureText(line, 12))) + 16;
    const labelHeight = lines.length * 14 + 10;
    const anchor = curve.handle;
    const rect = placeLabel(
      plot,
      labelWidth,
      labelHeight,
      [
        { x: anchor.x + 10, y: anchor.y - labelHeight - 18 },
        { x: anchor.x + 10, y: anchor.y + 18 },
        { x: anchor.x - labelWidth - 10, y: anchor.y - labelHeight - 18 },
        { x: anchor.x - labelWidth - 10, y: anchor.y + 18 },
      ],
      [
        ...handleRects,
        ...equilibriumRects,
        ...labelRects.map((placed) => placed.rect),
      ],
    );
    labelRects.push({ id: `curve:${curve.spec.id}`, rect });
    return {
      ...curve,
      label: {
        x: rect.x + 8,
        y: rect.y + 15,
        rect,
        lines,
        lineHeight: 14,
      },
    };
  });

  const annotations = [...(scenario.annotations ?? [])]
    .sort((first, second) => second.priority - first.priority)
    .map((spec, annotationIndex) => {
      const anchor = { x: xScale(spec.x), y: yScale(spec.y) };
      const maximumLabelWidth = Math.max(
        68,
        Math.min(compact ? 148 : 200, plot.width * 0.66),
      );
      const lines = wrapText(
        spec.label,
        maximumLabelWidth - 16,
        12,
        measureText,
      );
      const labelWidth =
        Math.max(...lines.map((line) => measureText(line, 12))) + 16;
      const labelHeight = lines.length * 14 + 10;
      const rect = placeLabel(
        plot,
        labelWidth,
        labelHeight,
        [
          { x: anchor.x + 10, y: anchor.y - labelHeight - 14 },
          { x: anchor.x + 10, y: anchor.y + 14 },
          { x: anchor.x - labelWidth - 10, y: anchor.y - labelHeight - 14 },
          { x: anchor.x - labelWidth - 10, y: anchor.y + 14 },
          {
            x: plot.x + 8,
            y: plot.y + plot.height - labelHeight - 8 - annotationIndex * 8,
          },
        ],
        [
          ...handleRects,
          ...equilibriumRects,
          ...labelRects.map((placed) => placed.rect),
        ],
      );
      labelRects.push({ id: `annotation:${spec.id}`, rect });
      return {
        spec,
        anchor,
        label: {
          x: rect.x + 8,
          y: rect.y + 15,
          rect,
          lines,
          lineHeight: 14,
        },
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

  const legendStartY = plot.y + plot.height + axisLastBaselineOffset + 24;
  const legendRowOffsets: number[] = [];
  let accumulatedLegendHeight = 0;
  for (const rowHeight of legendRowHeights) {
    legendRowOffsets.push(accumulatedLegendHeight);
    accumulatedLegendHeight += rowHeight + 7;
  }
  const legend: GraphLayout["legend"] = {
    items: legendPlans.map((item) => {
      const y = legendStartY + legendRowOffsets[item.row] + 12;
      return {
        curveId: item.curveId,
        label: item.label,
        lines: item.lines,
        x: plot.x + item.offsetX,
        y,
        lineHeight: 14,
        rect: {
          x: plot.x + item.offsetX,
          y: y - 11,
          width: item.width,
          height: item.height,
        },
      };
    }),
  };

  return {
    width: safeWidth,
    height: safeHeight,
    plot,
    xTicks,
    yTicks,
    curves,
    equilibrium,
    baselineEquilibrium,
    annotations,
    axisTitles,
    equilibriumBanner,
    legend,
    labelRects,
  };
}

export function buildGraphLayout(
  scenario: GraphScenario,
  state: GraphState,
  width: number,
  height: number,
  measureText: TextMeasure = approximateTextMeasure,
): GraphLayout {
  let attemptedHeight = Math.max(360, height);
  const growthStep = Math.max(
    120,
    (scenario.curves.length + (scenario.annotations?.length ?? 0)) * 42,
  );
  for (let attempt = 0; attempt < 12; attempt += 1) {
    try {
      return buildGraphLayoutAtHeight(
        scenario,
        state,
        width,
        attemptedHeight,
        measureText,
      );
    } catch (error) {
      if (!(error instanceof LabelPlacementError)) throw error;
      attemptedHeight += growthStep;
    }
  }
  throw new Error("Graph labels cannot be placed without overlap.");
}

export function validateScenario(scenario: GraphScenario): string[] {
  const errors: string[] = [];
  const nonEmpty = (value: unknown) =>
    typeof value === "string" && value.trim().length > 0;
  const finite = (value: unknown) =>
    typeof value === "number" && Number.isFinite(value);
  if (
    !nonEmpty(scenario.id) ||
    !nonEmpty(scenario.title) ||
    !nonEmpty(scenario.accessibleSummary) ||
    !nonEmpty(scenario.learningPurpose)
  )
    errors.push("Scenario identity and accessible copy are required.");
  for (const [name, axis] of [
    ["x", scenario.xAxis],
    ["y", scenario.yAxis],
  ] as const) {
    if (!nonEmpty(axis.label)) errors.push(`${name}-axis label is required.`);
    if (
      !finite(axis.domain[0]) ||
      !finite(axis.domain[1]) ||
      axis.domain[0] >= axis.domain[1]
    )
      errors.push("Axis domains must contain finite increasing values.");
    if (
      !Number.isInteger(axis.preferredTickCount) ||
      axis.preferredTickCount < 1
    )
      errors.push("Axis tick counts must be positive integers.");
  }
  if (scenario.interaction.snapValues.length === 0)
    errors.push("At least one interaction snap value is required.");
  if (
    scenario.interaction.snapValues.some(
      (value, index, values) =>
        !finite(value) || (index > 0 && value <= values[index - 1]),
    )
  )
    errors.push(
      "Interaction snap values must be finite, unique, and increasing.",
    );
  if (
    !finite(scenario.interaction.minimumHitTarget) ||
    scenario.interaction.minimumHitTarget < 44
  )
    errors.push("Interactive graph hit targets must be at least 44 pixels.");
  if (scenario.curves.length === 0)
    errors.push("At least one curve is required.");
  if (
    new Set(scenario.curves.map((curve) => curve.id)).size !==
    scenario.curves.length
  )
    errors.push("Curve IDs must be unique.");
  for (const curve of scenario.curves) {
    if (
      !nonEmpty(curve.id) ||
      !nonEmpty(curve.label) ||
      !nonEmpty(curve.semanticRole) ||
      !nonEmpty(curve.color)
    )
      errors.push(
        "Curve identity, label, semantic role, and color are required.",
      );
    if (
      curve.adjustable &&
      (!finite(curve.shiftStep) || (curve.shiftStep ?? 0) <= 0)
    )
      errors.push(
        `Adjustable curve ${curve.id} requires a positive shiftStep.`,
      );
    if (curve.equation.kind === "linear") {
      if (!finite(curve.equation.slope) || !finite(curve.equation.intercept))
        errors.push(`Linear curve ${curve.id} requires finite coefficients.`);
    } else {
      if (curve.equation.points.length < 2)
        errors.push(`Point curve ${curve.id} requires at least two points.`);
      if (
        curve.equation.points.some(
          (point, index, points) =>
            !finite(point.x) ||
            !finite(point.y) ||
            (index > 0 && point.x <= points[index - 1].x),
        )
      )
        errors.push(
          `Point curve ${curve.id} requires finite points in strictly increasing x order.`,
        );
    }
    if (
      curve.xDomain &&
      (!finite(curve.xDomain[0]) ||
        !finite(curve.xDomain[1]) ||
        curve.xDomain[0] >= curve.xDomain[1])
    )
      errors.push(
        `Curve ${curve.id} xDomain must contain finite increasing values.`,
      );
  }
  if (scenario.equilibrium) {
    if (!nonEmpty(scenario.equilibrium.label))
      errors.push("Equilibrium label is required.");
    if (scenario.equilibrium.curveIds[0] === scenario.equilibrium.curveIds[1])
      errors.push("Equilibrium must reference two distinct curves.");
    if (
      scenario.equilibrium.curveIds.some(
        (id) => !scenario.curves.some((curve) => curve.id === id),
      )
    )
      errors.push("Equilibrium references an unknown curve.");
  }
  for (const annotation of scenario.annotations ?? []) {
    if (!nonEmpty(annotation.id) || !nonEmpty(annotation.label))
      errors.push("Annotation identity and label are required.");
    if (
      !finite(annotation.x) ||
      !finite(annotation.y) ||
      !finite(annotation.priority) ||
      annotation.x < scenario.xAxis.domain[0] ||
      annotation.x > scenario.xAxis.domain[1] ||
      annotation.y < scenario.yAxis.domain[0] ||
      annotation.y > scenario.yAxis.domain[1]
    )
      errors.push(
        `Annotation ${annotation.id} requires finite coordinates inside the axis domains and a finite priority.`,
      );
  }
  if (
    new Set((scenario.annotations ?? []).map((annotation) => annotation.id))
      .size !== (scenario.annotations ?? []).length
  )
    errors.push("Annotation IDs must be unique.");
  if (
    !nonEmpty(scenario.style.grid) ||
    !nonEmpty(scenario.style.axis) ||
    !nonEmpty(scenario.style.background) ||
    !nonEmpty(scenario.style.equilibrium)
  )
    errors.push("Graph style tokens are required.");
  return errors;
}
