import { useEffect, useState, memo, useCallback } from "react";
import { motion } from "framer-motion";
import LoadingSplash from "./components/LoadingSplash";
import { useStore } from "./data/useStore";
import { GITHUB_CONFIG } from "./data/githubSync";
import { SECURITY_CONFIG } from "./data/authData";
import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
  Navigate,
} from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import GalleryPage from "./pages/GalleryPage";
import ChapterPage from "./pages/ChapterPage";
import AboutPage from "./pages/AboutPage";
import "./styles/globals.css";
import CustomCursor from "./components/CustomCursor";
import NotFound from "./components/NotFound";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminGuard from "./pages/admin/AdminGuard";
import AdminLogin from "./pages/admin/AdminLogin";
import LockdownCheck from "./components/LockdownCheck";
import AnnounceModal from "./components/AnnounceModal";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

// Global Real-time Sync Engine - Silent Background Update & Auto-Deploy
function RealtimeSync() {
  const { setChaptersDirect } = useStore();
  const [initialSha, setInitialSha] = useState(null);
  const [jsonMissing, setJsonMissing] = useState(false);

  useEffect(() => {
    const { owner, repo, branch, getToken, filePath } = GITHUB_CONFIG;

    const checkUpdates = async () => {
      try {
        const token = getToken();
        const headers = { Accept: "application/vnd.github+json" };
        if (token) headers.Authorization = `Bearer ${token}`;

        const res = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/commits/${branch}`,
          { headers },
        );
        if (!res.ok) return;
        const commitData = await res.json();
        const currentSha = commitData.sha;

        if (!initialSha) {
          setInitialSha(currentSha);
          return;
        }

        if (currentSha !== initialSha) {
          const fileRes = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/commits?path=${filePath}&sha=${branch}&per_page=1`,
            { headers },
          );

          if (fileRes.ok) {
            const fileCommits = await fileRes.json();
            const latestFileSha = fileCommits[0]?.sha;

            if (currentSha === latestFileSha) {
              let fetchedData = null;
              if (!jsonMissing) {
                const jsonPath = "src/data/photos.json";
                const checkRes = await fetch(
                  `https://api.github.com/repos/${owner}/${repo}/commits?path=${jsonPath}&sha=${branch}&per_page=1`,
                  { headers },
                );
                const commits = checkRes.ok ? await checkRes.json() : [];
                const exists = Array.isArray(commits) && commits.length > 0;

                if (exists) {
                  const r = await fetch(
                    token
                      ? `https://api.github.com/repos/${owner}/${repo}/contents/${jsonPath}?ref=${branch}`
                      : `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${jsonPath}`,
                    {
                      headers: token
                        ? {
                            ...headers,
                            Accept: "application/vnd.github.v3.raw",
                          }
                        : {},
                    },
                  );
                  if (r.ok) fetchedData = await r.json();
                } else {
                  setJsonMissing(true);
                }
              }

              if (!fetchedData) {
                const r = await fetch(
                  token
                    ? `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`
                    : `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`,
                  {
                    headers: token
                      ? { ...headers, Accept: "application/vnd.github.v3.raw" }
                      : {},
                  },
                );
                if (r.ok) {
                  const text = await r.text();
                  const match = text.match(
                    /export const chapters = (\[[\s\S]*?\]);/,
                  );
                  if (match) fetchedData = new Function(`return ${match[1]}`)();
                }
              }

              if (fetchedData && Array.isArray(fetchedData)) {
                setChaptersDirect(fetchedData);
                setInitialSha(currentSha);
                return;
              }
            } else {
              console.log("New code deployment detected. Reloading...");
              window.location.reload();
            }
          }
        }
      } catch (err) {
        console.error("Error checking for updates:", err);
      }
    };

    const interval = setInterval(checkUpdates, 60000);
    checkUpdates();
    return () => clearInterval(interval);
  }, [initialSha, setChaptersDirect, jsonMissing]);

  return null;
}

function AppContent() {
  const [isLoading, setIsLoading] = useState(true);
  const { pathname } = useLocation();

  useEffect(() => {
    localStorage.removeItem("memoire_data");
    const handlePageLoad = () => setIsLoading(false);
    if (document.readyState === "complete") {
      setIsLoading(false);
    } else {
      window.addEventListener("load", handlePageLoad);
      return () => window.removeEventListener("load", handlePageLoad);
    }
  }, []);

  const isAdminRoute = pathname.startsWith("/admin");

  return (
    <>
      <RealtimeSync />
      {isLoading && <LoadingSplash />}
      <ScrollToTop />
      <CustomCursor />
      <div className="relative min-h-screen grain">
        <div className="bg-orb bg-orb-1" />
        <div className="bg-orb bg-orb-2" />
        <div className="bg-orb bg-orb-3" />
        <div className="relative z-10">
          {!isAdminRoute && <Navbar />}
          <main>
            <Routes>
              <Route path="/admin" element={<AdminLogin />} />
              <Route
                path="/admin/dashboard"
                element={
                  <AdminGuard>
                    <AdminDashboard />
                  </AdminGuard>
                }
              />
              <Route path="/" element={<Home />} />
              <Route path="/gallery" element={<GalleryPage />} />
              <Route path="/chapter/:slug" element={<ChapterPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/404" element={<NotFound />} />
              <Route path="*" element={<Navigate to="/404" replace />} />
            </Routes>
          </main>
          {!isAdminRoute && <Footer />}
        </div>
      </div>
    </>
  );
}

// SECURITY: Nuclear Lock System
const SEC_KEY = "_m_sys_integrity_v2";
const SEC_VAL = "BAN_VOX_99";
const DEV_KEY = "_m_dev_mode_active";

// Dynamically derive master hash from authData.js at runtime
// When owner changes lockdownCode via dashboard → pushes new authData.js →
// Vercel rebuilds → this line picks up the new value automatically.
const MASTER_HASH = btoa(SECURITY_CONFIG.lockdownCode);

function NuclearLock({ onUnlock }) {
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);

  const handleVerify = () => {
    if (btoa(input) === MASTER_HASH) {
      localStorage.removeItem(SEC_KEY);
      sessionStorage.removeItem(SEC_KEY);
      sessionStorage.setItem(DEV_KEY, "true");
      onUnlock();
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[999999] bg-[#05050a] flex flex-col items-center justify-center p-6 text-center"
    >
      <div className="w-20 h-20 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mb-8 animate-pulse">
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </div>
      <h1 className="font-display text-2xl text-white mb-2 uppercase tracking-[0.3em]">
        SYSTEM LOCKDOWN
      </h1>
      <p className="font-body text-xs text-white/30 mb-10 max-w-xs leading-relaxed">
        Unauthorized activity detected. This website has been locked to protect
        data integrity. Please enter the{" "}
        <strong className="text-white/50">Owner Verification Code</strong> to
        resume access.
      </p>

      <div className="w-full max-w-sm space-y-4">
        <div
          className={`relative transition-all duration-300 ${error ? "scale-95" : ""}`}
        >
          <input
            type="password"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleVerify()}
            className={`w-full bg-white/[0.03] border ${
              error ? "border-red-500/50" : "border-white/10"
            } rounded-2xl px-6 py-5 text-center font-display tracking-[0.5em] text-white focus:outline-none focus:border-[#e8c4a0]/50 transition-all`}
            placeholder="••••••••••••"
            autoFocus
          />
          {error && (
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 text-red-400 font-display text-[10px] uppercase tracking-widest"
            >
              Invalid Security Code
            </motion.p>
          )}
        </div>
        <button
          onClick={handleVerify}
          className="w-full py-5 rounded-2xl bg-white text-black font-display text-[10px] uppercase tracking-[0.2em] font-bold hover:bg-[#e8c4a0] transition-all"
        >
          Verify Identity
        </button>
      </div>
    </motion.div>
  );
}

function SecurityGuard({ children }) {
  const [isLocked, setIsLocked] = useState(() => {
    return (
      localStorage.getItem(SEC_KEY) === SEC_VAL ||
      sessionStorage.getItem(SEC_KEY) === SEC_VAL
    );
  });

  const isDevMode = sessionStorage.getItem(DEV_KEY) === "true";

  const triggerLock = useCallback(() => {
    if (isDevMode) return;
    localStorage.setItem(SEC_KEY, SEC_VAL);
    sessionStorage.setItem(SEC_KEY, SEC_VAL);
    setIsLocked(true);
  }, [isDevMode]);

  useEffect(() => {
    if (isLocked || isDevMode) return;

    const handleContextMenu = (e) => e.preventDefault();

    const handleKeyDown = (e) => {
      if (
        e.key === "F12" ||
        (e.ctrlKey &&
          e.shiftKey &&
          (e.key === "I" || e.key === "J" || e.key === "C" || e.key === "K")) ||
        (e.ctrlKey && e.key === "U")
      ) {
        e.preventDefault();
        triggerLock();
        return false;
      }
    };

    const detectDevTools = () => {
      const threshold = 160;
      if (
        window.outerWidth - window.innerWidth > threshold ||
        window.outerHeight - window.innerHeight > threshold
      ) {
        triggerLock();
      }
    };

    const trap = setInterval(() => {
      const start = performance.now();
      debugger;
      if (performance.now() - start > 100) {
        triggerLock();
      }
    }, 500);

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.addedNodes.length > 0) {
          mutation.addedNodes.forEach((node) => {
            if (
              node.tagName === "SCRIPT" ||
              node.id === "hacker-tool" ||
              node.className?.includes?.("hacker")
            ) {
              triggerLock();
            }
          });
        }
      });
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });

    window.addEventListener("resize", detectDevTools);
    window.addEventListener("contextmenu", handleContextMenu);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("resize", detectDevTools);
      window.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("keydown", handleKeyDown);
      clearInterval(trap);
      observer.disconnect();
    };
  }, [isLocked, triggerLock]);

  if (isLocked) {
    return <NuclearLock onUnlock={() => setIsLocked(false)} />;
  }

  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <SecurityGuard>
        <LockdownCheck currentPath={location.pathname}>
          <AppContent />
        </LockdownCheck>
        <AnnounceModal />
      </SecurityGuard>
    </BrowserRouter>
  );
}