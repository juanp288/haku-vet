"use client";

import type { WeightHistoryPoint } from "@vetclinic/contracts";
import { useState } from "react";

const WIDTH = 640;
const HEIGHT = 220;
const PADDING = { top: 16, right: 16, bottom: 28, left: 40 };
const PLOT_WIDTH = WIDTH - PADDING.left - PADDING.right;
const PLOT_HEIGHT = HEIGHT - PADDING.top - PADDING.bottom;

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "2-digit" });
}

function niceStep(range: number): number {
  if (range <= 2) return 0.5;
  if (range <= 5) return 1;
  if (range <= 20) return 5;
  if (range <= 50) return 10;
  return 20;
}

interface WeightChartProps {
  points: WeightHistoryPoint[];
}

/**
 * D5: "gráfica de evolución del peso" — SVG hecho a mano (sin librería
 * nueva, CLAUDE.md regla 9). Una sola serie: sin leyenda (el título ya la
 * nombra), línea de 2px, marcadores ≥8px con anillo de superficie, ejes
 * discretos, crosshair+tooltip al pasar el mouse.
 */
export function WeightChart({ points }: WeightChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (points.length < 2) {
    return (
      <div className="flex h-[140px] items-center justify-center rounded-[12px] border border-dashed border-neutral-300 text-[13px] text-neutral-500">
        {points.length === 0
          ? "Aún no hay pesos registrados para graficar."
          : "Se necesita más de un peso registrado para mostrar la evolución."}
      </div>
    );
  }

  const weights = points.map((p) => p.weightKg);
  const times = points.map((p) => new Date(p.occurredAt).getTime());
  const minWeight = Math.min(...weights);
  const maxWeight = Math.max(...weights);
  const weightPad = Math.max((maxWeight - minWeight) * 0.15, 0.5);
  const yMin = Math.max(0, minWeight - weightPad);
  const yMax = maxWeight + weightPad;
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const timeRange = maxTime - minTime || 1;

  const x = (time: number) => PADDING.left + ((time - minTime) / timeRange) * PLOT_WIDTH;
  const y = (weight: number) => PADDING.top + (1 - (weight - yMin) / (yMax - yMin)) * PLOT_HEIGHT;

  const coords = points.map((p) => ({ x: x(new Date(p.occurredAt).getTime()), y: y(p.weightKg), point: p }));
  const linePath = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");

  const step = niceStep(yMax - yMin);
  const gridStart = Math.ceil(yMin / step) * step;
  const gridLines: number[] = [];
  for (let value = gridStart; value <= yMax; value += step) {
    gridLines.push(value);
  }

  const hovered = hoverIndex !== null ? coords[hoverIndex] : undefined;

  const handleMove = (event: React.MouseEvent<SVGRectElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const relativeX = ((event.clientX - rect.left) / rect.width) * WIDTH;
    let nearest = 0;
    let nearestDistance = Infinity;
    coords.forEach((c, i) => {
      const distance = Math.abs(c.x - relativeX);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = i;
      }
    });
    setHoverIndex(nearest);
  };

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        role="img"
        aria-label="Evolución del peso en kilogramos a lo largo del tiempo"
      >
        {gridLines.map((value) => (
          <g key={value}>
            <line
              x1={PADDING.left}
              x2={WIDTH - PADDING.right}
              y1={y(value)}
              y2={y(value)}
              stroke="var(--border)"
              strokeWidth={1}
            />
            <text x={PADDING.left - 8} y={y(value)} textAnchor="end" dominantBaseline="middle" className="fill-neutral-500 text-[10px]">
              {value % 1 === 0 ? value : value.toFixed(1)}
            </text>
          </g>
        ))}

        <text x={x(minTime)} y={HEIGHT - 6} textAnchor="start" className="fill-neutral-500 text-[10px]">
          {formatShortDate(points[0]!.occurredAt)}
        </text>
        <text x={x(maxTime)} y={HEIGHT - 6} textAnchor="end" className="fill-neutral-500 text-[10px]">
          {formatShortDate(points[points.length - 1]!.occurredAt)}
        </text>

        <path d={linePath} fill="none" stroke="var(--color-accent)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

        {coords.map((c, i) => (
          <circle
            key={c.point.occurredAt}
            cx={c.x}
            cy={c.y}
            r={hoverIndex === i ? 5 : 4}
            fill="var(--color-accent)"
            stroke="var(--card)"
            strokeWidth={2}
          />
        ))}

        {hovered && (
          <line
            x1={hovered.x}
            x2={hovered.x}
            y1={PADDING.top}
            y2={HEIGHT - PADDING.bottom}
            stroke="var(--color-accent)"
            strokeWidth={1}
            strokeDasharray="3,3"
            opacity={0.5}
          />
        )}

        <rect
          x={PADDING.left}
          y={PADDING.top}
          width={PLOT_WIDTH}
          height={PLOT_HEIGHT}
          fill="transparent"
          onMouseMove={handleMove}
          onMouseLeave={() => setHoverIndex(null)}
        />
      </svg>

      {hovered && (
        <div
          className="pointer-events-none absolute top-1 rounded-[8px] border border-border bg-card px-2.5 py-1.5 text-[12px] shadow-[0_4px_12px_rgba(14,27,42,.12)]"
          style={{
            left: `${(hovered.x / WIDTH) * 100}%`,
            transform: hovered.x > WIDTH * 0.7 ? "translateX(-100%)" : undefined,
          }}
        >
          <div className="font-extrabold text-neutral-800">{hovered.point.weightKg} kg</div>
          <div className="text-neutral-500">{formatShortDate(hovered.point.occurredAt)}</div>
        </div>
      )}
    </div>
  );
}
