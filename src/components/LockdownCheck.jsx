// src/components/LockdownCheck.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Taruh komponen ini di src/App.jsx atau src/main.jsx (wrap seluruh app)
// Komponen ini akan fetch /lockdown.json dan menampilkan layar lockdown
// jika active: true
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';

export default function LockdownCheck({ children }) {
  const [status, setStatus]   = useState('loading'); // 'loading' | 'locked' | 'ok'
  const [data,   setData]     = useState(null);

  useEffect(() => {
    const check = async () => {
      try {
        const res  = await fetch('/lockdown.json?_=' + Date.now(), { cache: 'no-store' });
        if (!res.ok) { setStatus('ok'); return; }
        const json = await res.json();
        if (json?.active === true) {
          setData(json);
          setStatus('locked');
        } else {
          setStatus('ok');
        }
      } catch {
        // Jika file tidak ada, lanjut normal
        setStatus('ok');
      }
    };

    check();
    // Re-check setiap 60 detik
    const interval = setInterval(check, 60_000);
    return () => clearInterval(interval);
  }, []);

  if (status === 'loading') {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: '#0a0a1a', color: '#8b7cf8',
        fontFamily: 'sans-serif',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: '3px solid #8b7cf8', borderTopColor: 'transparent',
            borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: '#64748b', fontSize: 14 }}>Loading…</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (status === 'locked') {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: '#04040d', color: '#e2e8f0',
        fontFamily: "'Segoe UI', system-ui, sans-serif", padding: '24px',
      }}>
        <div style={{ textAlign: 'center', maxWidth: 480 }}>
          {/* Lock icon */}
          <div style={{
            width: 80, height: 80, borderRadius: '50%', margin: '0 auto 24px',
            background: 'linear-gradient(135deg,rgba(220,38,38,.2),rgba(147,51,234,.15))',
            border: '1px solid rgba(220,38,38,.3)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', fontSize: 32,
          }}>
            🔒
          </div>

          {/* Media image */}
          {data?.mediaUrl && (
            <img src={data.mediaUrl} alt="maintenance"
              style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 12, marginBottom: 24, border: '1px solid rgba(255,255,255,.1)' }}
            />
          )}

          <h1 style={{
            fontSize: 28, fontWeight: 700, marginBottom: 12,
            background: 'linear-gradient(135deg,#f87171,#a78bfa)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            Under Maintenance
          </h1>

          {data?.reason && (
            <p style={{ color: '#94a3b8', fontSize: 16, lineHeight: 1.6, marginBottom: 8 }}>
              {data.reason}
            </p>
          )}

          <p style={{ color: '#475569', fontSize: 13, marginTop: 16 }}>
            {data?.timestamp ? (
              <>Since {new Date(data.timestamp).toLocaleString('id-ID')}</>
            ) : null}
          </p>

          <div style={{ marginTop: 32, padding: '12px 24px', borderRadius: 12,
            background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)',
            display: 'inline-block' }}>
            <p style={{ color: '#64748b', fontSize: 12, margin: 0 }}>
              Halaman ini sedang dalam pemeliharaan. Silakan coba lagi nanti.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return children;
}
