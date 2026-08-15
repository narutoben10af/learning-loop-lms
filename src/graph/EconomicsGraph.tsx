import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import type { Shift } from "../domain/activity";
import {
  approximateTextMeasure,
  buildGraphLayout,
  CURVE_HANDLE_HEIGHT,
  CURVE_HANDLE_WIDTH,
  formatAxisValue,
  validateScenario,
  type GraphScenario,
  type GraphState,
  type TextMeasure,
} from "./model";

interface EconomicsGraphProps {
  scenario: GraphScenario;
  state: GraphState;
  onShift: (curveId: string, shift: Shift) => void;
  onCheck: () => void;
}

function snapShift(value: number, snapValues: Shift[]): Shift {
  return snapValues.reduce((closest, candidate) =>
    Math.abs(candidate - value) < Math.abs(closest - value)
      ? candidate
      : closest,
  );
}

function shiftText(shift: Shift): string {
  return shift === -1
    ? "one step left"
    : shift === 1
      ? "one step right"
      : "unchanged";
}

function ValidatedEconomicsGraph({
  scenario,
  state,
  onShift,
  onCheck,
}: EconomicsGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(720);
  const drag = useRef<{
    curveId: string;
    startX: number;
    startShift: Shift;
    stepPixels: number;
  } | null>(null);

  useLayoutEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const update = () => {
      const measured = element.clientWidth;
      if (measured > 0) setWidth(measured);
    };
    update();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", update);
      return () => window.removeEventListener("resize", update);
    }
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const measureText = useMemo<TextMeasure>(() => {
    if (
      typeof document === "undefined" ||
      typeof CanvasRenderingContext2D === "undefined"
    )
      return approximateTextMeasure;
    const context = document.createElement("canvas").getContext("2d");
    if (!context) return approximateTextMeasure;
    return (text, fontSize) => {
      context.font = `600 ${fontSize}px Inter, ui-sans-serif, system-ui, sans-serif`;
      return context.measureText(text).width;
    };
  }, []);
  const height = width < 420 ? 430 : width < 680 ? 460 : 500;
  const layout = useMemo(
    () => buildGraphLayout(scenario, state, width, height, measureText),
    [height, measureText, scenario, state, width],
  );

  const beginDrag = (event: PointerEvent<SVGPathElement>, curveId: string) => {
    const curve = scenario.curves.find((candidate) => candidate.id === curveId);
    if (!curve?.adjustable || !curve.shiftStep) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      curveId,
      startX: event.clientX,
      startShift: state.shifts[curveId] ?? 0,
      stepPixels:
        (layout.plot.width * curve.shiftStep) /
        (scenario.xAxis.domain[1] - scenario.xAxis.domain[0]),
    };
  };

  const continueDrag = (event: PointerEvent<SVGPathElement>) => {
    if (!drag.current) return;
    const next = snapShift(
      drag.current.startShift +
        (event.clientX - drag.current.startX) / drag.current.stepPixels,
      scenario.interaction.snapValues,
    );
    if (next !== (state.shifts[drag.current.curveId] ?? 0)) {
      onShift(drag.current.curveId, next);
    }
  };

  const endDrag = (event: PointerEvent<SVGPathElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    drag.current = null;
  };

  const handleKey = (event: KeyboardEvent<SVGPathElement>, curveId: string) => {
    const current = state.shifts[curveId] ?? 0;
    const snapValues = scenario.interaction.snapValues;
    const currentIndex = Math.max(0, snapValues.indexOf(current));
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      onShift(curveId, snapValues[Math.max(0, currentIndex - 1)]);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      onShift(
        curveId,
        snapValues[Math.min(snapValues.length - 1, currentIndex + 1)],
      );
    } else if (event.key === "Home") {
      event.preventDefault();
      onShift(curveId, snapValues.includes(0) ? 0 : snapValues[0]);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onCheck();
    }
  };

  const equilibriumText = layout.equilibrium
    ? `${formatAxisValue(scenario.yAxis, layout.equilibrium.yValue)} · ${Math.round(layout.equilibrium.xValue)} ${scenario.xAxis.unit ?? "units"}`
    : "No intersection in range";
  const baselineEquilibriumText = layout.baselineEquilibrium
    ? `${formatAxisValue(scenario.yAxis, layout.baselineEquilibrium.yValue)} · ${Math.round(layout.baselineEquilibrium.xValue)} ${scenario.xAxis.unit ?? "units"}`
    : null;
  const annotationText = layout.annotations
    .map((annotation) => annotation.spec.label)
    .join(". ");

  return (
    <figure
      className="economics-graph"
      aria-labelledby={`${scenario.id}-title`}
    >
      <figcaption>
        <strong id={`${scenario.id}-title`}>{scenario.title}</strong>
        <span>{scenario.accessibleSummary}</span>
      </figcaption>
      <div ref={containerRef} className="graph-canvas">
        <svg
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          role="group"
          aria-label={`${scenario.title}. ${scenario.accessibleSummary} ${baselineEquilibriumText ? `Before equilibrium ${baselineEquilibriumText}. ` : ""}Current equilibrium ${equilibriumText}.${annotationText ? ` ${annotationText}.` : ""}`}
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <clipPath id={`${scenario.id}-plot-clip`}>
              <rect
                x={layout.plot.x}
                y={layout.plot.y}
                width={layout.plot.width}
                height={layout.plot.height}
              />
            </clipPath>
          </defs>
          <rect
            className="graph-background"
            x="0"
            y="0"
            width={layout.width}
            height={layout.height}
            fill={scenario.style.background}
          />

          <g
            className="equilibrium-banner"
            transform={`translate(${layout.equilibriumBanner.x},${layout.equilibriumBanner.y})`}
          >
            <rect
              width={layout.equilibriumBanner.width}
              height={layout.equilibriumBanner.height}
              rx="10"
            />
            {baselineEquilibriumText ? (
              <>
                <text x="12" y="18">
                  Before
                </text>
                <text className="equilibrium-value compact" x="67" y="18">
                  {baselineEquilibriumText}
                </text>
                <text x="12" y="43">
                  Now
                </text>
                <text className="equilibrium-value compact" x="67" y="43">
                  {equilibriumText}
                </text>
              </>
            ) : (
              <>
                <text x="12" y="20">
                  Current equilibrium
                </text>
                <text className="equilibrium-value" x="12" y="42">
                  {equilibriumText}
                </text>
              </>
            )}
          </g>

          <g className="graph-grid" aria-hidden="true">
            {layout.xTicks.map((tick) => (
              <line
                key={`x-grid-${tick.value}`}
                x1={tick.x}
                x2={tick.x}
                y1={layout.plot.y}
                y2={layout.plot.y + layout.plot.height}
                stroke={scenario.style.grid}
              />
            ))}
            {layout.yTicks.map((tick) => (
              <line
                key={`y-grid-${tick.value}`}
                x1={layout.plot.x}
                x2={layout.plot.x + layout.plot.width}
                y1={tick.y}
                y2={tick.y}
                stroke={scenario.style.grid}
              />
            ))}
          </g>

          <g
            className="graph-axes"
            aria-hidden="true"
            fill={scenario.style.axis}
            stroke={scenario.style.axis}
          >
            <line
              x1={layout.plot.x}
              x2={layout.plot.x}
              y1={layout.plot.y}
              y2={layout.plot.y + layout.plot.height}
            />
            <line
              x1={layout.plot.x}
              x2={layout.plot.x + layout.plot.width}
              y1={layout.plot.y + layout.plot.height}
              y2={layout.plot.y + layout.plot.height}
            />
            {layout.xTicks.map((tick) => (
              <g key={`x-tick-${tick.value}`}>
                <line
                  x1={tick.x}
                  x2={tick.x}
                  y1={layout.plot.y + layout.plot.height}
                  y2={layout.plot.y + layout.plot.height + 6}
                />
                <text
                  x={tick.x}
                  y={layout.plot.y + layout.plot.height + 21}
                  textAnchor="middle"
                  stroke="none"
                >
                  {tick.label}
                </text>
              </g>
            ))}
            {layout.yTicks.map((tick) => (
              <g key={`y-tick-${tick.value}`}>
                <line
                  x1={layout.plot.x - 6}
                  x2={layout.plot.x}
                  y1={tick.y}
                  y2={tick.y}
                />
                <text
                  x={layout.plot.x - 11}
                  y={tick.y + 4}
                  textAnchor="end"
                  stroke="none"
                >
                  {tick.label}
                </text>
              </g>
            ))}
            <text
              className="axis-title"
              x={layout.axisTitles.x.x}
              y={layout.axisTitles.x.y}
              textAnchor="middle"
              stroke="none"
            >
              {layout.axisTitles.x.lines.map((line, index) => (
                <tspan
                  key={`${line}-${index}`}
                  x={layout.axisTitles.x.x}
                  dy={index === 0 ? 0 : layout.axisTitles.x.lineHeight}
                >
                  {line}
                </tspan>
              ))}
            </text>
            <text
              className="axis-title"
              transform={`translate(${layout.axisTitles.y.x} ${layout.axisTitles.y.y}) rotate(-90)`}
              textAnchor="middle"
              stroke="none"
            >
              {layout.axisTitles.y.lines.map((line, index) => (
                <tspan
                  key={`${line}-${index}`}
                  x="0"
                  dy={index === 0 ? 0 : layout.axisTitles.y.lineHeight}
                >
                  {line}
                </tspan>
              ))}
            </text>
          </g>

          <g clipPath={`url(#${scenario.id}-plot-clip)`}>
            {layout.baselineEquilibrium && (
              <g
                className="equilibrium-guides baseline"
                stroke={scenario.style.equilibrium}
                aria-hidden="true"
              >
                <line
                  x1={layout.plot.x}
                  x2={layout.baselineEquilibrium.x}
                  y1={layout.baselineEquilibrium.y}
                  y2={layout.baselineEquilibrium.y}
                />
                <line
                  x1={layout.baselineEquilibrium.x}
                  x2={layout.baselineEquilibrium.x}
                  y1={layout.baselineEquilibrium.y}
                  y2={layout.plot.y + layout.plot.height}
                />
              </g>
            )}
            {layout.equilibrium && (
              <g
                className="equilibrium-guides"
                stroke={scenario.style.equilibrium}
                aria-hidden="true"
              >
                <line
                  x1={layout.plot.x}
                  x2={layout.equilibrium.x}
                  y1={layout.equilibrium.y}
                  y2={layout.equilibrium.y}
                />
                <line
                  x1={layout.equilibrium.x}
                  x2={layout.equilibrium.x}
                  y1={layout.equilibrium.y}
                  y2={layout.plot.y + layout.plot.height}
                />
              </g>
            )}
            {layout.curves.map(
              (curve) =>
                curve.baselinePath && (
                  <path
                    key={`baseline-${curve.spec.id}`}
                    className="curve-baseline"
                    d={curve.baselinePath}
                    fill="none"
                    stroke={curve.spec.color}
                    strokeWidth="3"
                    aria-hidden="true"
                  />
                ),
            )}
            {layout.curves.map((curve) => (
              <path
                key={`visible-${curve.spec.id}`}
                className="curve-current"
                d={curve.path}
                fill="none"
                stroke={curve.spec.color}
                strokeWidth="4"
                strokeDasharray={curve.spec.dash}
              />
            ))}
          </g>

          {layout.curves.map((curve) => (
            <g key={`interaction-${curve.spec.id}`}>
              <rect
                className="curve-label-bg"
                x={curve.label.rect.x}
                y={curve.label.rect.y}
                width={curve.label.rect.width}
                height={curve.label.rect.height}
                rx="7"
              />
              <text
                className="curve-label"
                x={curve.label.x}
                y={curve.label.y}
                fill={curve.spec.color}
              >
                {curve.label.lines.map((line, index) => (
                  <tspan
                    key={`${line}-${index}`}
                    x={curve.label.x}
                    dy={index === 0 ? 0 : curve.label.lineHeight}
                  >
                    {line}
                  </tspan>
                ))}
              </text>
              {curve.spec.adjustable && (
                <>
                  <rect
                    className="curve-handle"
                    x={curve.handle.x - CURVE_HANDLE_WIDTH / 2}
                    y={curve.handle.y - CURVE_HANDLE_HEIGHT / 2}
                    width={CURVE_HANDLE_WIDTH}
                    height={CURVE_HANDLE_HEIGHT}
                    rx="8"
                    fill={curve.spec.color}
                    stroke={curve.spec.color}
                    strokeWidth="3"
                    aria-hidden="true"
                  />
                  <path
                    className="curve-handle-grip"
                    d={`M ${curve.handle.x - 18} ${curve.handle.y - 5} h 10 M ${curve.handle.x - 18} ${curve.handle.y} h 10 M ${curve.handle.x - 18} ${curve.handle.y + 5} h 10`}
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    aria-hidden="true"
                  />
                  <text
                    className="curve-handle-label"
                    x={curve.handle.x + 2}
                    y={curve.handle.y + 4}
                    fill="white"
                    aria-hidden="true"
                  >
                    Shift
                  </text>
                  <path
                    className="curve-hit"
                    d={curve.path}
                    fill="none"
                    stroke="transparent"
                    strokeWidth={scenario.interaction.minimumHitTarget}
                    role="slider"
                    tabIndex={0}
                    aria-label={`${curve.spec.label} curve shift control`}
                    aria-valuemin={scenario.interaction.snapValues[0]}
                    aria-valuemax={scenario.interaction.snapValues.at(-1)}
                    aria-valuenow={state.shifts[curve.spec.id] ?? 0}
                    aria-valuetext={shiftText(state.shifts[curve.spec.id] ?? 0)}
                    onPointerDown={(event) => beginDrag(event, curve.spec.id)}
                    onPointerMove={continueDrag}
                    onPointerUp={endDrag}
                    onPointerCancel={endDrag}
                    onKeyDown={(event) => handleKey(event, curve.spec.id)}
                  />
                </>
              )}
            </g>
          ))}

          {layout.annotations.map((annotation) => (
            <g
              key={`annotation-${annotation.spec.id}`}
              className="graph-annotation"
              aria-hidden="true"
            >
              {annotation.line && (
                <line
                  x1={annotation.line.x1}
                  x2={annotation.line.x2}
                  y1={annotation.line.y1}
                  y2={annotation.line.y2}
                  stroke={scenario.style.equilibrium}
                  strokeDasharray="8 6"
                  strokeWidth="2"
                />
              )}
              {annotation.spec.kind === "point" && (
                <circle
                  cx={annotation.anchor.x}
                  cy={annotation.anchor.y}
                  r="6"
                  fill={scenario.style.equilibrium}
                />
              )}
              <rect
                className="curve-label-bg"
                x={annotation.label.rect.x}
                y={annotation.label.rect.y}
                width={annotation.label.rect.width}
                height={annotation.label.rect.height}
                rx="7"
              />
              <text
                className="curve-label"
                x={annotation.label.x}
                y={annotation.label.y}
                fill={scenario.style.axis}
              >
                {annotation.label.lines.map((line, index) => (
                  <tspan
                    key={`${line}-${index}`}
                    x={annotation.label.x}
                    dy={index === 0 ? 0 : annotation.label.lineHeight}
                  >
                    {line}
                  </tspan>
                ))}
              </text>
            </g>
          ))}

          {layout.baselineEquilibrium && (
            <circle
              className="equilibrium-point baseline-equilibrium-point"
              cx={layout.baselineEquilibrium.x}
              cy={layout.baselineEquilibrium.y}
              r="7"
              fill={scenario.style.background}
              stroke={scenario.style.equilibrium}
              strokeWidth="3"
            >
              <title>{`Before ${layout.baselineEquilibrium.label.toLowerCase()}: ${baselineEquilibriumText}`}</title>
            </circle>
          )}
          {layout.equilibrium && (
            <circle
              className="equilibrium-point current-equilibrium-point"
              cx={layout.equilibrium.x}
              cy={layout.equilibrium.y}
              r="7"
              fill={scenario.style.equilibrium}
              stroke="white"
              strokeWidth="3"
            >
              <title>{`${scenario.equilibrium?.label}: ${equilibriumText}`}</title>
            </circle>
          )}

          <g className="graph-legend" aria-hidden="true">
            {layout.legend.items.map((item) => {
              const curve = scenario.curves.find(
                (candidate) => candidate.id === item.curveId,
              );
              return (
                <g
                  key={`legend-${item.curveId}`}
                  transform={`translate(${item.x},${item.y})`}
                >
                  <line
                    x1="0"
                    x2="24"
                    y1="0"
                    y2="0"
                    stroke={curve?.color}
                    strokeWidth="4"
                  />
                  <text x="31" y="4">
                    {item.lines.map((line, index) => (
                      <tspan
                        key={`${line}-${index}`}
                        x="31"
                        dy={index === 0 ? 0 : item.lineHeight}
                      >
                        {line}
                      </tspan>
                    ))}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>
      {baselineEquilibriumText && (
        <div className="graph-comparison-summary" role="note">
          <div>
            <strong>Before</strong>
            <span>{baselineEquilibriumText}</span>
          </div>
          <div>
            <strong>Now</strong>
            <span>{equilibriumText}</span>
          </div>
          <p>
            Dashed curve and hollow amber point = before. Solid curve and filled
            amber point = now.
          </p>
        </div>
      )}
      <p className="graph-instructions">
        Use the filled Shift control on a curve to drag it left or right.
        Keyboard: focus a curve shift control, use Left/Right Arrow, Home to
        reset, and Enter or Space to check. After a shift, dashed/hollow marks
        show the baseline and solid/filled marks show the new result. The
        controls and schedule below perform the same adjustment.
      </p>
      <p className="sr-only" aria-live="polite">
        {scenario.curves
          .map(
            (curve) =>
              `${curve.label} ${shiftText(state.shifts[curve.id] ?? 0)}.`,
          )
          .join(" ")}{" "}
        {baselineEquilibriumText
          ? `Before equilibrium ${baselineEquilibriumText}. `
          : ""}
        Current equilibrium {equilibriumText}.
        {annotationText ? ` ${annotationText}.` : ""}
      </p>
    </figure>
  );
}

export function EconomicsGraph(props: EconomicsGraphProps) {
  const errors = validateScenario(props.scenario);
  if (errors.length > 0) {
    return (
      <section className="graph-error" role="alert">
        <strong>This graph scenario cannot be displayed.</strong>
        <p>{errors.join(" ")}</p>
      </section>
    );
  }
  return <ValidatedEconomicsGraph {...props} />;
}
