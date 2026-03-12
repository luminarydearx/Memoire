import { useState, useEffect } from "react";

const STORAGE_KEY = "saturn_announcement_seen";

const TYPE_STYLES = {
  info: { color: "#60a5fa", icon: "ℹ️", glow: "rgba(59,130,246,.35)" },
  success: { color: "#4ade80", icon: "✅", glow: "rgba(34,197,94,.35)" },
  warning: { color: "#facc15", icon: "⚠️", glow: "rgba(245,158,11,.35)" },
  error: { color: "#f87171", icon: "🚨", glow: "rgba(220,38,38,.35)" },
};

export default function AnnounceBar() {
  const [data, setData] = useState(null);
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const fetchAnnouncement = async () => {
      try {
        const res = await fetch("/announce.json?_=" + Date.now(), {
          cache: "no-store",
        });

        if (!res.ok) return;

        const json = await res.json();

        // reset storage jika admin mematikan announcement
        if (json?.active === false) {
          localStorage.removeItem(STORAGE_KEY);
          setVisible(false);
          return;
        }

        if (json?.active && json?.message) {
          const announcementHash = btoa(json.message);
          const storedHash = localStorage.getItem(STORAGE_KEY);

          // jika sudah pernah melihat announcement yang sama
          if (storedHash === announcementHash) {
            return;
          }

          setData(json);
          setVisible(true);
          setClosing(false);

          // simpan setelah muncul
          localStorage.setItem(STORAGE_KEY, announcementHash);

          setTimeout(() => {
            handleClose();
          }, 15000);
        }
      } catch {
        // silent fail
      }
    };

    fetchAnnouncement();

    const interval = setInterval(fetchAnnouncement, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleClose = () => {
    setClosing(true);
    setTimeout(() => {
      setVisible(false);
    }, 400);
  };

  if (!visible || !data) return null;

  const style = TYPE_STYLES[data.type] || TYPE_STYLES.info;

  return (
    <>
      <div
        style={{
          position: "fixed",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(0,0,0,.35)",
          backdropFilter: "blur(6px)",
          zIndex: 9999,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            pointerEvents: "auto",
            width: "min(460px,92%)",
            borderRadius: 18,
            padding: "24px 26px",
            position: "relative",
            background:
              "linear-gradient(145deg, rgba(20,20,40,.85), rgba(10,10,25,.85))",
            backdropFilter: "blur(16px)",
            border: "1px solid rgba(255,255,255,.08)",
            boxShadow: `
              0 10px 40px rgba(0,0,0,.6),
              0 0 20px ${style.glow}
            `,
            transform: closing ? "translateY(-50px) scale(.96)" : "translateY(0)",
            opacity: closing ? 0 : 1,
            transition: "all .45s cubic-bezier(.22,.9,.32,1)",
            fontFamily: "'Segoe UI', system-ui, sans-serif",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: 18,
              padding: 1,
              background: `linear-gradient(135deg, transparent, ${style.glow}, transparent)`,
              WebkitMask:
                "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
              WebkitMaskComposite: "xor",
              maskComposite: "exclude",
              pointerEvents: "none",
            }}
          />

          <div style={{ display: "flex", gap: 14 }}>
            <div
              style={{
                fontSize: 26,
                filter: `drop-shadow(0 0 6px ${style.glow})`,
              }}
            >
              {style.icon}
            </div>

            <div style={{ flex: 1 }}>
              <p
                style={{
                  margin: 0,
                  color: "#e2e8f0",
                  fontSize: 15,
                  lineHeight: 1.6,
                }}
              >
                {data.message}
              </p>

              {data.link && data.linkText && (
                <a
                  href={data.link}
                  target="_blank"
                  rel="noopener"
                  style={{
                    display: "inline-block",
                    marginTop: 10,
                    color: style.color,
                    fontWeight: 600,
                    textDecoration: "none",
                    fontSize: 14,
                  }}
                >
                  {data.linkText} →
                </a>
              )}
            </div>

            <button
              onClick={handleClose}
              style={{
                border: "none",
                background: "rgba(255,255,255,.05)",
                borderRadius: 8,
                cursor: "pointer",
                width: 28,
                height: 28,
                color: "#94a3b8",
                fontSize: 16,
              }}
            >
              ×
            </button>
          </div>

          <div
            style={{
              marginTop: 18,
              height: 3,
              width: "100%",
              borderRadius: 10,
              overflow: "hidden",
              background: "rgba(255,255,255,.05)",
            }}
          >
            <div
              style={{
                height: "100%",
                width: "100%",
                background: `linear-gradient(90deg, ${style.color}, transparent)`,
                animation: "announceProgress 15s linear forwards",
              }}
            />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes announceProgress {
          from { width:100% }
          to { width:0% }
        }
      `}</style>
    </>
  );
}