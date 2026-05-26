import React from 'react';
import { Crown, Check, Zap, Shield, Database, Sparkles } from 'lucide-react';

const css = {
  container: {
    padding: '72px 14px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
    color: 'var(--ct-text, #fff)',
    fontFamily: 'Plus Jakarta Sans, Inter, sans-serif'
  },
  header: {
    textAlign: 'center',
    marginBottom: 10
  },
  title: {
    fontSize: 24,
    fontWeight: 900,
    background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    marginTop: 8
  },
  card: {
    background: 'var(--ct-card, rgba(255,255,255,0.05))',
    border: '1px solid var(--ct-glass-border, rgba(255,255,255,0.1))',
    borderRadius: 20,
    padding: 24,
    position: 'relative',
    overflow: 'hidden'
  },
  cardPremium: {
    background: 'linear-gradient(180deg, rgba(251,191,36,0.1) 0%, rgba(0,0,0,0) 100%)',
    border: '1px solid rgba(251,191,36,0.3)',
  },
  price: {
    fontSize: 36,
    fontWeight: 900,
    display: 'flex',
    alignItems: 'flex-start',
    gap: 4
  },
  currency: {
    fontSize: 18,
    marginTop: 6,
    color: 'var(--ct-muted)'
  },
  period: {
    fontSize: 14,
    color: 'var(--ct-muted)',
    fontWeight: 500
  },
  featureList: {
    marginTop: 24,
    display: 'flex',
    flexDirection: 'column',
    gap: 14
  },
  featureItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    fontSize: 14,
    fontWeight: 600
  },
  btn: {
    width: '100%',
    padding: '16px',
    borderRadius: 14,
    border: 'none',
    fontWeight: 800,
    fontSize: 16,
    cursor: 'pointer',
    marginTop: 24,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
  }
};

export default function SubscriptionEngine({ currentTier = 'free', onUpgrade }) {
  return (
    <div style={css.container}>
      <div style={css.header}>
        <Crown size={48} color="#fbbf24" style={{ margin: '0 auto' }} />
        <div style={css.title}>CrimeTrack OS Plus</div>
        <p style={{ color: 'var(--ct-muted)', fontSize: 13, marginTop: 8 }}>
          Upgrade to the world's most powerful Police AI ecosystem.
        </p>
      </div>

      <div style={{ ...css.card, ...css.cardPremium }}>
        <div style={{ position: 'absolute', top: 0, right: 0, background: '#fbbf24', color: '#000', padding: '6px 16px', fontSize: 11, fontWeight: 900, borderBottomLeftRadius: 16, textTransform: 'uppercase' }}>
          Recommended
        </div>
        
        <div style={{ fontSize: 18, fontWeight: 800, color: '#fbbf24', marginBottom: 12 }}>Pro Intelligence</div>
        <div style={css.price}>
          <span style={css.currency}>₹</span>199<span style={css.period}>/month</span>
        </div>

        <div style={css.featureList}>
          <div style={css.featureItem}>
            <div style={{ background: 'rgba(34, 197, 94, 0.2)', padding: 4, borderRadius: '50%' }}>
              <Check size={14} color="#22c55e" />
            </div>
            Universal Gemini AI Assistant
          </div>
          <div style={css.featureItem}>
            <div style={{ background: 'rgba(34, 197, 94, 0.2)', padding: 4, borderRadius: '50%' }}>
              <Check size={14} color="#22c55e" />
            </div>
            Full Operation Room Access
          </div>
          <div style={css.featureItem}>
            <div style={{ background: 'rgba(34, 197, 94, 0.2)', padding: 4, borderRadius: '50%' }}>
              <Check size={14} color="#22c55e" />
            </div>
            <Sparkles size={16} color="#a855f7" style={{marginRight: -4}} /> Unlimited AI Document Scans
          </div>
          <div style={css.featureItem}>
            <div style={{ background: 'rgba(34, 197, 94, 0.2)', padding: 4, borderRadius: '50%' }}>
              <Check size={14} color="#22c55e" />
            </div>
            Advanced Face Search Engine
          </div>
          <div style={css.featureItem}>
            <div style={{ background: 'rgba(34, 197, 94, 0.2)', padding: 4, borderRadius: '50%' }}>
              <Check size={14} color="#22c55e" />
            </div>
            Cross-Database Cloud Sync
          </div>
        </div>

        <button 
          style={{ ...css.btn, background: '#fbbf24', color: '#000' }}
          onClick={() => onUpgrade && onUpgrade('pro')}
        >
          <Zap size={18} fill="#000" /> Unlock CrimeTrack OS
        </button>
      </div>

      <div style={css.card}>
        <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--ct-muted)', marginBottom: 12 }}>Basic Local</div>
        <div style={css.price}>
          <span style={css.currency}>₹</span>0<span style={css.period}>/forever</span>
        </div>
        
        <div style={css.featureList}>
          <div style={{...css.featureItem, color: 'var(--ct-muted)'}}>
            <Shield size={16} /> Offline Local Storage
          </div>
          <div style={{...css.featureItem, color: 'var(--ct-muted)'}}>
            <Database size={16} /> Basic Form Entry
          </div>
        </div>

        <button 
          style={{ ...css.btn, background: 'var(--ct-glass-bg)', color: 'var(--ct-text)', border: '1px solid var(--ct-glass-border)' }}
          disabled
        >
          Current Plan
        </button>
      </div>
    </div>
  );
}
