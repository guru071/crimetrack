import { useState, useEffect } from 'react';
import { Shield } from 'lucide-react';

export function SecurityAuditDashboard({ theme, css }) {
  const [auditLogs, setAuditLogs] = useState([]);

  useEffect(() => {
    const logs = JSON.parse(localStorage.getItem('crimetrack_audit_logs') || '[]');
    setAuditLogs(logs.slice(-20).reverse());
  }, []);

  const actionColors = {
    'CREATE': theme.green,
    'UPDATE': theme.blue,
    'DELETE': theme.red,
    'VIEW': theme.muted,
    'EXPORT': theme.purple,
    'SYNC': theme.accentColor,
  };

  return (
    <div style={{ padding: '72px 14px 14px' }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: theme.accentColor, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Shield size={20} /> Security & Audit Logs
      </div>

      <div style={{ ...css.card, marginBottom: 16 }}>
        <div style={css.sectionTitle}>▸ Recent Activity</div>
        {auditLogs.length === 0 ? (
          <div style={{ color: theme.muted, textAlign: 'center', padding: '20px', fontSize: 13 }}>No audit logs yet</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {auditLogs.map((log, i) => {
              const color = actionColors[log.action] || theme.muted;
              return (
                <div key={i} style={{
                  padding: '10px',
                  background: theme.cardColor + '80',
                  borderLeft: `3px solid ${color}`,
                  borderRadius: '4px',
                  fontSize: 12,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, color }}>{log.action}</span>
                    <span style={{ color: theme.muted, fontSize: 10 }}>
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div style={{ color: theme.muted }}>
                    {log.details} {log.recordId && `(ID: ${log.recordId})`}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Security Tips */}
      <div style={{ ...css.card }}>
        <div style={css.sectionTitle}>▸ Security Tips</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            '🔐 Keep your PIN secure and change it regularly',
            '🔒 Enable biometric authentication for faster access',
            '📊 Monitor audit logs for unauthorized access attempts',
            '☁️ Sync data to Google Sheets for backup',
            '🛡️ Use strong encryption for sensitive fields',
          ].map((tip, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12, color: theme.text }}>
              <span style={{ flexShrink: 0 }}>✓</span>
              <span>{tip}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default SecurityAuditDashboard;
