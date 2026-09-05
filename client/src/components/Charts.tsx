import { useId, useState } from 'react';
import type { TrendPoint } from '../lib/api';
import { money, monthLabel } from '../lib/format';

/**
 * Net sales per month — one series, so no legend: the caption names it.
 * The current month is the emphasis mark; earlier months sit in the track
 * tone as context. Bars carry rounded tops anchored to the baseline, with a
 * 2px gap of surface between neighbours.
 */
export function TrendChart({
  data, currency, height = 116,
}: { data: TrendPoint[]; currency?: string; height?: number }) {
  const [active, setActive] = useState<number | null>(null);
  const clipId = useId();

  if (data.length === 0) return null;

  const width = 320;
  const axisHeight = 16;
  const plotHeight = height - axisHeight;
  const gap = 2;
  const slot = width / data.length;
  const barWidth = Math.max(10, slot - 10 - gap);

  const values = data.map((point) => point.net);
  const maxValue = Math.max(...values, 0);
  const minValue = Math.min(...values, 0);
  const span = maxValue - minValue || 1;
  // Where zero sits in the plot — bars grow up from it, losses hang below.
  const baselineY = (maxValue / span) * plotHeight;

  const shown = active ?? data.length - 1;
  const point = data[shown];

  return (
    <div>
      <div className="chart-tip">
        <span className="m">{monthLabel(point.month)}</span>
        <span className="v">{money(point.net, currency)}</span>
      </div>
      <svg
        className="chart"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Net sales by month. ${data
          .map((entry) => `${monthLabel(entry.month)} ${entry.net}`)
          .join(', ')}.`}
        onMouseLeave={() => setActive(null)}
      >
        <defs>
          <clipPath id={clipId}>
            <rect x="0" y="0" width={width} height={plotHeight} />
          </clipPath>
        </defs>

        {data.map((entry, index) => {
          const x = index * slot + (slot - barWidth) / 2;
          const magnitude = (Math.abs(entry.net) / span) * plotHeight;
          const isLoss = entry.net < 0;
          const y = isLoss ? baselineY : baselineY - magnitude;
          const radius = Math.min(4, magnitude / 2 || 0);
          // One bar is the emphasis mark — the one the caption is describing.
          // It starts on the current month and follows the reader's selection.
          const emphasised = index === shown;

          return (
            <g key={entry.month}>
              {/* Hit area is the full slot — a 12px bar is too small to tap. */}
              <rect
                x={index * slot} y={0} width={slot} height={height}
                fill="transparent"
                onMouseEnter={() => setActive(index)}
                onClick={() => setActive(index)}
              />
              <path
                clipPath={`url(#${clipId})`}
                className={`col${emphasised ? ' current' : ''}${isLoss ? ' negative' : ''}`}
                style={{ pointerEvents: 'none' }}
                d={
                  isLoss
                    ? `M${x} ${y} h${barWidth} v${magnitude - radius} a${radius} ${radius} 0 0 1 -${radius} ${radius} h-${
                        barWidth - radius * 2
                      } a${radius} ${radius} 0 0 1 -${radius} -${radius} z`
                    : `M${x} ${y + magnitude} v-${magnitude - radius} a${radius} ${radius} 0 0 1 ${radius} -${radius} h${
                        barWidth - radius * 2
                      } a${radius} ${radius} 0 0 1 ${radius} ${radius} v${magnitude - radius} z`
                }
              />
            </g>
          );
        })}

        <line className="baseline" x1="0" y1={baselineY} x2={width} y2={baselineY} />

        {data.map((entry, index) => (
          <text
            key={entry.month}
            className="axis"
            x={index * slot + slot / 2}
            y={height - 3}
            textAnchor="middle"
            style={{ fontWeight: index === shown ? 700 : 400 }}
          >
            {monthLabel(entry.month).slice(0, 3)}
          </text>
        ))}
      </svg>
    </div>
  );
}

/**
 * A single ratio against a limit. The fill carries severity, the track is a
 * lighter step of the same ramp, and the numbers are always spelled out beside
 * it — the state is never carried by colour alone.
 */
export function Meter({
  label, value, target, currency, pace, onHero,
}: {
  label: string; value: number; target: number;
  currency?: string; pace?: number; onHero?: boolean;
}) {
  if (!target) {
    return (
      <div className="meter">
        <div className="meter-head">
          <span className="muted">{label}</span>
          <span className="value">{money(value, currency)}</span>
        </div>
        <div className="meter-note">No target set for this month.</div>
      </div>
    );
  }

  const percent = (value / target) * 100;
  const behindBy = pace != null ? percent - pace : null;
  const state =
    behindBy == null || percent >= 100
      ? 'on-track'
      : behindBy >= 0
        ? 'ahead'
        : behindBy > -15
          ? 'behind'
          : 'at-risk';

  const note =
    percent >= 100
      ? 'Target reached'
      : behindBy == null
        ? `${money(target - value, currency)} to go`
        : behindBy >= 0
          ? `Ahead of pace · ${money(target - value, currency)} to go`
          : `${Math.abs(Math.round(behindBy))}% behind pace · ${money(target - value, currency)} to go`;

  return (
    <div className="meter">
      <div className="meter-head">
        <span className={onHero ? '' : 'muted'}>{label}</span>
        <span className="value">
          {Math.round(percent)}% of {money(target, currency)}
        </span>
      </div>
      <div
        className="meter-track"
        role="meter"
        aria-valuenow={Math.round(percent)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label}: ${Math.round(percent)} percent of target`}
      >
        <div className={`meter-fill ${state}`} style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} />
        {pace != null && pace < 100 && <div className="meter-pace" style={{ left: `${pace}%` }} />}
      </div>
      <div className="meter-note">{note}</div>
    </div>
  );
}
