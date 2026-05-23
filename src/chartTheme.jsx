import React from 'react';

export const CHART_COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

export const STATUS_SLICE_COLORS = {
  Active: '#ef4444',
  Arrested: '#f59e0b',
  Acquitted: '#10b981',
  Absconding: '#8b5cf6',
  Deceased: '#6b7280',
};

export const SEX_SLICE_COLORS = {
  Male: '#3b82f6',
  Female: '#ec4899',
  Other: '#8b5cf6',
};

export function sliceColor(name, index, map = STATUS_SLICE_COLORS) {
  return map[name] || CHART_COLORS[index % CHART_COLORS.length];
}

export const CHART_TOOLTIP_PROPS = {
  contentStyle: {
    background: 'rgba(8, 12, 24, 0.97)',
    border: '1px solid rgba(255, 255, 255, 0.28)',
    borderRadius: 12,
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 600,
    boxShadow: '0 8px 28px rgba(0, 0, 0, 0.55)',
  },
  itemStyle: { color: '#ffffff', fontWeight: 600 },
  labelStyle: { color: '#e2e8f0', marginBottom: 4 },
};

export const AXIS_TICK = { fill: '#f8fafc', fontSize: 12, fontWeight: 500 };
export const GRID_STROKE = 'rgba(255, 255, 255, 0.18)';

/** Legend list with name + % — readable on glass backgrounds */
export function ChartLegendList({ payload, dataKey = 'value' }) {
  if (!payload?.length) return null;
  const total = payload.reduce((sum, p) => sum + (Number(p.payload?.[dataKey]) || Number(p.value) || 0), 0);

  return (
    <ul
      style={{
        listStyle: 'none',
        margin: '16px 0 0',
        padding: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      {payload.map((entry, i) => {
        const val = Number(entry.payload?.[dataKey]) || Number(entry.value) || 0;
        const pct = total ? Math.round((val / total) * 100) : 0;
        return (
          <li
            key={`${entry.value}-${i}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              color: '#ffffff',
              fontSize: 14,
              fontWeight: 600,
              lineHeight: 1.3,
              textShadow: '0 1px 3px rgba(0,0,0,0.6)',
            }}
          >
            <span
              style={{
                width: 14,
                height: 14,
                borderRadius: 4,
                background: entry.color,
                flexShrink: 0,
                boxShadow: '0 0 0 1px rgba(255,255,255,0.35)',
              }}
            />
            <span style={{ flex: 1 }}>{entry.value}</span>
            <span style={{ color: '#fbbf24', fontWeight: 800, minWidth: 44, textAlign: 'right' }}>{pct}%</span>
          </li>
        );
      })}
    </ul>
  );
}
