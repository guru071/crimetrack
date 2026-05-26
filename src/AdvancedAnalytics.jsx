import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Users } from 'lucide-react';
import { CHART_TOOLTIP_PROPS, ChartLegendList, AXIS_TICK, GRID_STROKE, CHART_COLORS } from './chartTheme';

export function AdvancedAnalyticsDashboard({ records, theme, css }) {
  // Risk scoring
  const calculateRisk = (r) => {
    let score = 0;
    if (r.status === 'Active') score += 40;
    if (r.status === 'Absconding') score += 50;
    if (r.casesPending) score += Math.min(r.casesPending.split(',').length * 10, 30);
    if (r.gangLeader) score += 30;
    return Math.min(score, 100);
  };

  const riskDistribution = [
    { range: 'Critical (80-100)', count: records.filter(r => calculateRisk(r) >= 80).length },
    { range: 'High (60-79)', count: records.filter(r => { const s = calculateRisk(r); return s >= 60 && s < 80; }).length },
    { range: 'Medium (40-59)', count: records.filter(r => { const s = calculateRisk(r); return s >= 40 && s < 60; }).length },
    { range: 'Low (0-39)', count: records.filter(r => calculateRisk(r) < 40).length },
  ];

  // Hotspots
  const hotspots = {};
  records.forEach(r => {
    if (r.areaOfOperation) {
      const area = r.areaOfOperation.split(',')[0].trim();
      hotspots[area] = (hotspots[area] || 0) + 1;
    }
  });
  const topHotspots = Object.entries(hotspots)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, value]) => ({ name, value }));

  // Timeline
  const timeline = {};
  records.forEach(r => {
    if (r.createdAt) {
      const month = new Date(r.createdAt).toLocaleString('default', { month: 'short', year: '2-digit' });
      timeline[month] = (timeline[month] || 0) + 1;
    }
  });
  const timelineData = Object.entries(timeline).slice(-6).map(([month, count]) => ({ month, count }));

  // Gang network
  const gangNetwork = {};
  records.forEach(r => {
    if (r.gangLeader) {
      gangNetwork[r.gangLeader] = (gangNetwork[r.gangLeader] || 0) + 1;
    }
  });
  const topGangs = Object.entries(gangNetwork)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([gang, members]) => ({ gang, members }));

  const COLORS = [theme.red, theme.purple, theme.accentColor, theme.green].filter(Boolean);

  return (
    <div style={{ padding: '72px 14px 14px' }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: theme.accentColor, marginBottom: 16 }}>Advanced Analytics</div>

      {/* Risk Score Distribution */}
      <div style={{ ...css.card, marginBottom: 16 }}>
        <div style={css.sectionTitle}> Risk Score Distribution</div>
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={riskDistribution}
              cx="50%"
              cy="40%"
              outerRadius={58}
              dataKey="count"
              nameKey="range"
              paddingAngle={2}
              stroke="rgba(255,255,255,0.25)"
              strokeWidth={2}
            >
              {riskDistribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length] || CHART_COLORS[i]} />)}
            </Pie>
            <Tooltip {...CHART_TOOLTIP_PROPS} />
            <Legend content={(props) => <ChartLegendList payload={props.payload} dataKey="count" />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Crime Hotspots */}
      <div style={{ ...css.card, marginBottom: 16 }}>
        <div style={css.sectionTitle}> Top Crime Hotspots</div>
        {topHotspots.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={topHotspots}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
              <XAxis dataKey="name" tick={AXIS_TICK} />
              <YAxis tick={AXIS_TICK} allowDecimals={false} />
              <Tooltip {...CHART_TOOLTIP_PROPS} />
              <Bar dataKey="value" fill={theme.accentColor} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ color: theme.muted, textAlign: 'center', padding: '20px', fontSize: 13 }}>No data available</div>
        )}
      </div>

      {/* Timeline */}
      <div style={{ ...css.card, marginBottom: 16 }}>
        <div style={css.sectionTitle}> Records Over Time</div>
        {timelineData.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={timelineData}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
              <XAxis dataKey="month" tick={AXIS_TICK} />
              <YAxis tick={AXIS_TICK} allowDecimals={false} />
              <Tooltip {...CHART_TOOLTIP_PROPS} />
              <Line type="monotone" dataKey="count" stroke={theme.accentColor} strokeWidth={2} dot={{ fill: theme.accentColor, r: 4, stroke: '#fff', strokeWidth: 1 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ color: theme.muted, textAlign: 'center', padding: '20px', fontSize: 13 }}>No data available</div>
        )}
      </div>

      {/* Gang Network */}
      {topGangs.length > 0 && (
        <div style={{ ...css.card, marginBottom: 16 }}>
          <div style={css.sectionTitle}> Gang Network (Top Members)</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {topGangs.map((g, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: `1px solid ${theme.border}` }}>
                <Users size={16} color={theme.accentColor} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: theme.text }}>{g.gang}</div>
                  <div style={{ fontSize: 11, color: theme.muted }}>{g.members} members</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
