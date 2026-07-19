import React, { useState, useEffect, useRef } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
  ReferenceLine,
} from "recharts";
import {
  Home,
  BookOpen,
  BarChart3,
  User,
  ArrowUpRight,
  ArrowDownRight,
  Check,
  Radio,
  ChevronRight,
} from "lucide-react";

// ============================================================
// Design tokens
// ============================================================

const HEADING = { fontFamily: "'Montserrat', sans-serif" };
const MONO = { fontFamily: "'JetBrains Mono', monospace" };

// ============================================================
// Static data — used only by Profile view
// ============================================================

const WORKFLOWS = [
  { name: "Daily Brief", schedule: "08:30 PKT · weekdays", last: "Today 08:31" },
  { name: "Entry Logger", schedule: "10:00 PKT · weekdays", last: "Today 10:00" },
  { name: "Exit + Index Logger", schedule: "17:00 PKT · weekdays", last: "Yest. 17:01" },
  { name: "Weekly Review", schedule: "18:00 PKT · Fridays", last: "Fri 18:02" },
];

// Fallback intraday when API is loading — just to show the chart shape
const FALLBACK_INTRADAY = [
  { time: "—", ai: 0, kse: 0 },
];

// ============================================================
// Utilities
// ============================================================

const fmt = (n, d = 2) =>
  n.toLocaleString("en-PK", { minimumFractionDigits: d, maximumFractionDigits: d });

function useReveal(delay = 0) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setTimeout(() => setShown(true), delay);
          obs.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [delay]);
  return [ref, shown];
}

function useCountUp(target, duration = 1400) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start, raf;
    const tick = (t) => {
      if (!start) start = t;
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(target * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}

// Generic fetch hook
function useApi(url) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!url) {
      setError("URL not configured");
      setLoading(false);
      return;
    }
    let cancelled = false;
    fetch(url)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(json => {
        if (!cancelled) {
          setData(json);
          setLoading(false);
        }
      })
      .catch(err => {
        if (!cancelled) {
          console.error(`Failed to fetch ${url}:`, err);
          setError(err.message);
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [url]);

  return { data, loading, error };
}

// ============================================================
// Navigation
// ============================================================

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: Home },
  { id: "journal", label: "Journal", icon: BookOpen },
  { id: "insights", label: "Insights", icon: BarChart3 },
  { id: "profile", label: "Profile", icon: User },
];

// ============================================================
// Header
// ============================================================

function Header({ view, onView, time, marketOpen }) {
  return (
    <header className="flex items-center justify-between mb-6 md:mb-8 gap-4">
      <div className="flex items-center gap-2.5 shrink-0">
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center"
          style={{ background: "#0E5E4A" }}
        >
          <span className="text-[#7FD1AE] text-[22px] leading-none"
            style={{ ...HEADING, fontWeight: 500 }}>
            α
          </span>
        </div>
        <div className="leading-tight">
          <div className="text-[14px] text-[#0E1B18] tracking-tight"
            style={{ ...HEADING, fontWeight: 600 }}>
            PSX Alpha
          </div>
          <div className="text-[10px] text-[#6E7F79] tracking-[0.15em] uppercase">
            AI Analyst
          </div>
        </div>
      </div>

      <nav className="hidden md:flex items-center gap-1 rounded-full p-1.5"
        style={{ background: "#FFFFFF" }}>
        {NAV.map((n) => {
          const active = view === n.id;
          return (
            <button
              key={n.id}
              onClick={() => onView(n.id)}
              className="rounded-full px-5 py-2.5 text-[13px] transition-all duration-300"
              style={{
                background: active ? "#0E5E4A" : "transparent",
                color: active ? "#FFFFFF" : "#0E1B18",
                fontWeight: active ? 600 : 400,
                ...HEADING,
              }}>
              {n.label}
            </button>
          );
        })}
      </nav>

      <div className="hidden sm:flex items-center gap-2 rounded-full px-4 py-2.5 text-[12px] shrink-0"
        style={{ background: "#FFFFFF" }}>
        <span className="relative flex h-2 w-2">
          {marketOpen && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-70"
              style={{ background: "#22946B" }} />
          )}
          <span className="relative inline-flex rounded-full h-2 w-2"
            style={{ background: marketOpen ? "#22946B" : "#6E7F79" }} />
        </span>
        <span className="text-[#0E1B18]">
          {marketOpen ? "Open" : "Closed"} · {time}
        </span>
      </div>
    </header>
  );
}

function BottomNav({ view, onView }) {
  return (
    <nav
      className="md:hidden fixed bottom-4 left-4 right-4 z-40 rounded-full flex items-center gap-1 p-1.5"
      style={{
        background: "#0E5E4A",
        boxShadow: "0 16px 40px rgba(14,94,74,0.32)",
      }}>
      {NAV.map((n) => {
        const active = view === n.id;
        const Icon = n.icon;
        return (
          <button
            key={n.id}
            onClick={() => onView(n.id)}
            className="flex-1 flex items-center justify-center gap-2 rounded-full py-4 transition-all duration-300"
            style={{
              background: active ? "#7FD1AE" : "transparent",
              color: active ? "#0E1B18" : "rgba(255,255,255,0.65)",
            }}>
            <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
            {active && (
              <span className="text-[13px]" style={{ ...HEADING, fontWeight: 600 }}>
                {n.label}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}

// Floating pill nav — desktop only. Appears when the user has scrolled past
// the original header. Collapsed (nav only) when scrolling down, expanded
// (logo + nav + status) when scrolling up. Frosted glass background.
function FloatingPillNav({ view, onView, scrollState, marketOpen, time }) {
  const visible = scrollState !== "initial";
  const isExpanded = scrollState === "expanded";

  return (
    <div
      className="hidden md:flex fixed left-1/2 top-4 z-40 items-center gap-1 rounded-full p-1.5 transition-all duration-300 ease-out"
      style={{
        transform: `translateX(-50%) translateY(${visible ? "0" : "-120%"})`,
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "auto" : "none",
        background: "rgba(255,255,255,0.65)",
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
        border: "1px solid rgba(255,255,255,0.7)",
        boxShadow: "0 10px 30px rgba(14,27,24,0.08)",
      }}
    >
      {/* Logo — collapses when scrolling down, expands when scrolling up */}
      <div
        className="flex items-center gap-2 overflow-hidden transition-all duration-300 ease-out"
        style={{
          maxWidth: isExpanded ? 200 : 0,
          opacity: isExpanded ? 1 : 0,
          paddingLeft: isExpanded ? 8 : 0,
          paddingRight: isExpanded ? 4 : 0,
        }}
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
          style={{ background: "#0E5E4A" }}
        >
          <span className="text-[#7FD1AE] text-[16px] leading-none"
            style={{ ...HEADING, fontWeight: 500 }}>
            α
          </span>
        </div>
        <div className="text-[13px] text-[#0E1B18] tracking-tight shrink-0"
          style={{ ...HEADING, fontWeight: 600 }}>
          PSX Alpha
        </div>
      </div>

      {/* Nav — always visible, anchors the pill */}
      <nav className="flex items-center gap-1 shrink-0">
        {NAV.map((n) => {
          const active = view === n.id;
          return (
            <button
              key={n.id}
              onClick={() => onView(n.id)}
              className="rounded-full px-4 py-2 text-[13px] transition-all duration-300"
              style={{
                background: active ? "#0E5E4A" : "transparent",
                color: active ? "#FFFFFF" : "#0E1B18",
                fontWeight: active ? 600 : 400,
                ...HEADING,
              }}>
              {n.label}
            </button>
          );
        })}
      </nav>

      {/* Status pill — collapses when scrolling down, expands when scrolling up */}
      <div
        className="flex items-center overflow-hidden transition-all duration-300 ease-out"
        style={{
          maxWidth: isExpanded ? 220 : 0,
          opacity: isExpanded ? 1 : 0,
          paddingLeft: isExpanded ? 4 : 0,
          paddingRight: isExpanded ? 8 : 0,
        }}
      >
        <div className="flex items-center gap-2 rounded-full px-3 py-1.5 text-[12px] shrink-0"
          style={{ background: "rgba(255,255,255,0.55)" }}>
          <span className="relative flex h-2 w-2">
            {marketOpen && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-70"
                style={{ background: "#22946B" }} />
            )}
            <span className="relative inline-flex rounded-full h-2 w-2"
              style={{ background: marketOpen ? "#22946B" : "#6E7F79" }} />
          </span>
          <span className="text-[#0E1B18] whitespace-nowrap">
            {marketOpen ? "Open" : "Closed"} · {time}
          </span>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Section header, view header, greeting
// ============================================================

function SectionHeader({ eyebrow, title, action }) {
  return (
    <div className="flex items-end justify-between gap-4 mb-4 md:mb-5">
      <div className="min-w-0">
        {eyebrow && (
          <div className="text-[10px] tracking-[0.22em] uppercase text-[#14735C] mb-1.5"
            style={{ fontWeight: 700 }}>
            {eyebrow}
          </div>
        )}
        <h2 className="text-[#0E1B18] tracking-tight leading-tight text-[22px] md:text-[28px]"
          style={{ ...HEADING, fontWeight: 600, letterSpacing: "-0.02em" }}>
          {title}
        </h2>
      </div>
      {action && (
        <button
          onClick={action.onClick}
          className="text-[12px] text-[#14735C] hover:text-[#0E5E4A] transition-colors flex items-center gap-1 shrink-0"
          style={{ ...HEADING, fontWeight: 600 }}>
          {action.label}
          <ChevronRight size={13} />
        </button>
      )}
    </div>
  );
}

function ViewHeader({ eyebrow, title, subtitle }) {
  return (
    <div className="mb-6 md:mb-8">
      {eyebrow && (
        <div className="text-[10px] tracking-[0.22em] uppercase text-[#14735C] mb-2"
          style={{ fontWeight: 700 }}>
          {eyebrow}
        </div>
      )}
      <h1 className="text-[#0E1B18] tracking-tight leading-[0.95] text-[36px] md:text-[52px]"
        style={{ ...HEADING, fontWeight: 600, letterSpacing: "-0.025em" }}>
        {title}
      </h1>
      {subtitle && (
        <div className="mt-2 text-[13px] md:text-[14px] text-[#6E7F79] leading-relaxed">
          {subtitle}
        </div>
      )}
    </div>
  );
}

function Greeting({ time, marketOpen }) {
  return (
    <div className="mb-6 md:mb-8">
      <h1 className="text-[#0E1B18] tracking-tight leading-[0.95] text-[42px] md:text-[56px] lg:text-[64px]"
        style={{ ...HEADING, fontWeight: 600, letterSpacing: "-0.025em" }}>
        Hello, Rizwan.
      </h1>
      <div className="mt-3 flex items-center flex-wrap gap-x-3 gap-y-1 text-[13px] text-[#6E7F79]">
        <span>Sunday, 19 July 2026</span>
        <span className="w-1 h-1 rounded-full bg-[#C4D2CB]" />
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full"
            style={{ background: marketOpen ? "#22946B" : "#6E7F79" }} />
          {marketOpen ? "Market open" : "Market closed"} · {time} PKT
        </span>
      </div>
    </div>
  );
}

// ============================================================
// States: Loading / Error
// ============================================================

function LoadingState({ message = "Loading…" }) {
  return (
    <div className="py-20 text-center text-[#6E7F79]"
      style={{ ...HEADING, fontWeight: 500 }}>
      {message}
    </div>
  );
}

function ErrorState({ error }) {
  return (
    <div className="py-20 text-center">
      <div className="text-[#E27D6B] mb-2" style={{ ...HEADING, fontWeight: 600 }}>
        Couldn't reach the API
      </div>
      <div className="text-[#6E7F79] text-sm" style={MONO}>{error}</div>
    </div>
  );
}

// ============================================================
// Session banner — subtle context strip
// ============================================================

function SessionBanner({ message }) {
  if (!message) return null;
  return (
    <div className="flex items-center gap-2.5 rounded-full px-4 py-2.5 mb-5 md:mb-6 text-[12px] text-[#14735C]"
      style={{ background: "rgba(127,209,174,0.20)" }}>
      <span className="relative flex h-1.5 w-1.5 shrink-0">
        <span className="relative inline-flex rounded-full h-1.5 w-1.5"
          style={{ background: "#14735C" }} />
      </span>
      <span>{message}</span>
    </div>
  );
}

// ============================================================
// InfoTooltip — click / hover popover for explanations
// ============================================================

function InfoTooltip({ content, children }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  return (
    <span className="relative inline-flex items-center gap-1" ref={ref}>
      {children}
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="w-3.5 h-3.5 rounded-full inline-flex items-center justify-center text-[9px] transition-opacity hover:opacity-100"
        style={{
          background: "rgba(110,127,121,0.15)",
          color: "#6E7F79",
          opacity: 0.7,
          fontWeight: 700,
          ...HEADING,
        }}
        aria-label="Learn more"
      >
        i
      </button>
      {open && (
        <span className="absolute z-40 top-full left-1/2 mt-2 whitespace-normal text-left pointer-events-none"
          style={{
            transform: 'translateX(-50%)',
            width: 220,
            background: '#0E1B18',
            color: '#F1F7F3',
            padding: '10px 12px',
            borderRadius: 14,
            fontSize: 11,
            lineHeight: 1.5,
            boxShadow: '0 8px 24px rgba(14,27,24,0.25)',
            fontFamily: "'Lato', system-ui, sans-serif",
          }}
        >
          {content}
        </span>
      )}
    </span>
  );
}

// ============================================================
// Sparkline
// ============================================================

function Sparkline({ data, positive, height = 44 }) {
  const chartData = data.map((v, i) => ({ i, v }));
  const color = positive ? "#22946B" : "#E27D6B";
  const id = `spark-${Math.random().toString(36).slice(2, 8)}`;
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer>
        <AreaChart data={chartData} margin={{ top: 3, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.25} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.9}
            fill={`url(#${id})`} isAnimationActive animationDuration={1600} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ============================================================
// ALPHA HERO
// ============================================================

function AlphaHero({ data }) {
  const portfolioReturn = data?.portfolio?.return ?? 0;
  const kseReturn = data?.portfolio?.kseReturn ?? 0;
  const alpha = data?.portfolio?.alpha ?? 0;
  const intraday = data?.intraday && data.intraday.length > 0 ? data.intraday : FALLBACK_INTRADAY;
  const alphaVal = useCountUp(portfolioReturn);

  return (
    <div className="relative overflow-hidden p-6 md:p-10"
      style={{ background: "#0E5E4A", borderRadius: 30 }}>
      <div className="absolute -top-24 -right-16 w-72 h-72 rounded-full opacity-25 blur-3xl pointer-events-none"
        style={{ background: "#7FD1AE" }} />

      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] tracking-[0.22em] uppercase text-[#7FD1AE]"
              style={{ fontWeight: 700 }}>
              Today's Portfolio Alpha
            </div>
            <div className="text-[12px] text-white/60 mt-1">
              Live vs KSE-100 · {data?.picks?.length ?? 0} picks
            </div>
          </div>
          <div className="flex items-center gap-2 text-[11px] rounded-full px-3.5 py-2 text-white/85"
            style={{ background: "rgba(255,255,255,0.09)" }}>
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                style={{ background: "#7FD1AE" }} />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5"
                style={{ background: "#7FD1AE" }} />
            </span>
            {data?.marketOpen ? "Closes 15:30" : "Market closed"}
          </div>
        </div>

        <div className="mt-8 md:mt-10 flex items-baseline gap-1 md:gap-2">
          <span className="text-white/70 text-[36px] sm:text-[44px] md:text-[64px] lg:text-[72px]"
            style={{ ...HEADING, fontWeight: 300, lineHeight: 0.9 }}>
            {portfolioReturn >= 0 ? '+' : '−'}
          </span>
          <span className="text-white tabular-nums text-[88px] sm:text-[120px] md:text-[168px] lg:text-[192px]"
            style={{ ...HEADING, fontWeight: 400, letterSpacing: "-0.045em", lineHeight: 0.85 }}>
            {Math.abs(alphaVal).toFixed(2)}
          </span>
          <span className="text-white/70 text-[36px] sm:text-[44px] md:text-[64px] lg:text-[72px]"
            style={{ ...HEADING, fontWeight: 300, lineHeight: 0.9 }}>
            %
          </span>
        </div>

        <div className="mt-3 md:mt-4 text-[13px] md:text-[14px] text-white/70 flex items-center flex-wrap gap-x-2 gap-y-1">
          <span>Portfolio {portfolioReturn >= 0 ? '+' : ''}{portfolioReturn.toFixed(2)}%</span>
          <span className="text-white/30">·</span>
          <span>KSE-100 {kseReturn >= 0 ? '+' : ''}{kseReturn.toFixed(2)}%</span>
          <span className="text-white/30">·</span>
          <span className="text-[#7FD1AE]" style={{ fontWeight: 700 }}>
            α {alpha >= 0 ? '+' : ''}{alpha.toFixed(2)}
          </span>
        </div>

        <div className="mt-6 md:mt-8 h-40 md:h-48 -mx-2">
          <ResponsiveContainer>
            <AreaChart data={intraday} margin={{ top: 10, right: 12, bottom: 0, left: 12 }}>
              <defs>
                <linearGradient id="ai-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7FD1AE" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#7FD1AE" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="time" stroke="rgba(255,255,255,0.35)"
                tick={{ fontSize: 10, fontFamily: "JetBrains Mono", fill: "rgba(255,255,255,0.45)" }}
                axisLine={false} tickLine={false} interval={0} />
              <YAxis hide domain={["dataMin - 0.2", "dataMax + 0.2"]} />
              <Tooltip
                contentStyle={{
                  background: "rgba(14,27,24,0.94)", border: "none", borderRadius: 20,
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
                  color: "#F1F7F3", padding: "10px 14px",
                }}
                labelStyle={{ color: "#7FD1AE", marginBottom: 4 }}
                itemStyle={{ color: "#F1F7F3" }}
                formatter={(v, n) => [
                  `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`,
                  n === "ai" ? "Portfolio" : "KSE-100",
                ]}
              />
              <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" strokeDasharray="2 3" />
              <Area type="monotone" dataKey="kse" stroke="rgba(255,255,255,0.35)"
                strokeWidth={1.5} strokeDasharray="4 4" fill="transparent"
                animationDuration={1600} dot={false} />
              <Area type="monotone" dataKey="ai" stroke="#7FD1AE" strokeWidth={2.5}
                fill="url(#ai-fill)" animationDuration={1600}
                dot={(props) => {
                  const isLast = props.index === intraday.length - 1;
                  if (!isLast) return null;
                  return (
                    <g key={props.index}>
                      <circle cx={props.cx} cy={props.cy} r="7" fill="#7FD1AE" opacity="0.25" />
                      <circle cx={props.cx} cy={props.cy} r="4" fill="#7FD1AE"
                        stroke="#0E5E4A" strokeWidth="2" />
                    </g>
                  );
                }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-2 flex items-center justify-between text-[10px] tracking-[0.1em]"
          style={{ ...MONO, color: "rgba(255,255,255,0.45)" }}>
          <span>{data?.chartType === 'daily' ? '5-day view' : 'Intraday view'}</span>
          <span className="text-[#7FD1AE]">Last sync {data?.lastSync ?? '—'}</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Pick Card
// ============================================================

function PickCard({ pick, index }) {
  const [ref, shown] = useReveal(index * 90);
  const change = pick.current - pick.entry;
  const changePct = pick.entry ? (change / pick.entry) * 100 : 0;
  const positive = change >= 0;

  return (
    <div
      ref={ref}
      className="bg-white p-6 transition-all duration-500 hover:shadow-[0_10px_30px_rgba(14,94,74,0.08)]"
      style={{
        borderRadius: 30,
        transform: shown ? "translateY(0)" : "translateY(24px)",
        opacity: shown ? 1 : 0,
        transition: "transform 0.7s cubic-bezier(.2,.7,.2,1), opacity 0.7s ease, box-shadow 0.3s ease",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[22px] md:text-[24px] leading-none text-[#0E1B18] tracking-tight"
            style={{ ...MONO, fontWeight: 500 }}>
            {pick.ticker}
          </div>
          <div className="text-[11px] text-[#6E7F79] mt-1 truncate">{pick.name}</div>
        </div>
        <span className="text-[10px] px-3 py-1.5 rounded-full whitespace-nowrap"
          style={{ background: "#F1F7F3", color: "#14735C", fontWeight: 700, ...HEADING }}>
          {pick.sector}
        </span>
      </div>

      <div className="mt-6 flex items-baseline justify-between">
        <div className="text-[36px] md:text-[40px] tabular-nums leading-none text-[#0E1B18]"
          style={{ ...HEADING, fontWeight: 500, letterSpacing: "-0.025em" }}>
            {fmt(pick.current)}
        </div>
        <div className="flex items-center gap-1 text-[13px] tabular-nums rounded-full px-3 py-1"
          style={{
            background: positive ? "rgba(34,148,107,0.10)" : "rgba(226,125,107,0.10)",
            color: positive ? "#22946B" : "#E27D6B", fontWeight: 700,
          }}>
          {positive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
          {positive ? "+" : ""}{changePct.toFixed(2)}%
        </div>
      </div>

      <div className="mt-3">
        <Sparkline data={pick.spark} positive={positive} />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
        {[["Entry", pick.entry], ["High", pick.high], ["Low", pick.low]].map(([k, v]) => (
          <div key={k}>
            <div className="text-[9px] text-[#6E7F79] uppercase tracking-[0.15em]"
              style={{ fontWeight: 700 }}>
              {k}
            </div>
            <div className="text-[#0E1B18] tabular-nums mt-0.5" style={MONO}>
              {fmt(v)}
            </div>
          </div>
        ))}
      </div>

      {pick.reason && (
        <div className="mt-5 pt-4 text-[12px] leading-relaxed text-[#6E7F79] italic"
          style={{ borderTop: "1px dashed #D6E3DB" }}>
          "{pick.reason}"
        </div>
      )}
    </div>
  );
}

function FilterPills({ active, onChange, options }) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
      {options.map((opt) => {
        const isActive = active === opt.id;
        return (
          <button
            key={opt.id}
            onClick={() => onChange(opt.id)}
            className="whitespace-nowrap rounded-full text-[12px] px-4 py-2.5 transition-all duration-200 flex items-center gap-1.5"
            style={{
              background: isActive ? "#0E5E4A" : "#FFFFFF",
              color: isActive ? "#F1F7F3" : "#0E1B18",
              fontWeight: isActive ? 600 : 500,
              ...HEADING,
            }}>
            {opt.label}
            {opt.count !== undefined && (
              <span style={{ color: isActive ? "#7FD1AE" : "#6E7F79", ...MONO }}>
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function FilterDropdown({ label, active, options, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const activeOption = options.find(o => o.id === active);
  const isDefault = active === options[0]?.id;

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 rounded-full text-[12px] px-4 py-2.5 transition-all"
        style={{
          background: isDefault ? "#FFFFFF" : "#0E5E4A",
          color: isDefault ? "#0E1B18" : "#F1F7F3",
          fontWeight: isDefault ? 500 : 600,
          ...HEADING,
        }}>
        <span style={{ opacity: 0.7 }}>{label}:</span>
        <span>{activeOption?.label}</span>
        <ChevronRight
          size={13}
          style={{ transform: open ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform 0.2s' }}
        />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 z-30 bg-white overflow-hidden"
          style={{ borderRadius: 20, boxShadow: "0 12px 32px rgba(14,94,74,0.14)", minWidth: 200 }}>
          {options.map(opt => (
            <button
              key={opt.id}
              onClick={() => { onChange(opt.id); setOpen(false); }}
              className="w-full text-left px-4 py-3 text-[13px] transition-colors hover:bg-[#F1F7F3]"
              style={{
                background: opt.id === active ? "#F1F7F3" : "transparent",
                color: "#0E1B18",
                fontWeight: opt.id === active ? 600 : 400,
                ...HEADING,
              }}>
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TodayPicks({ picks: incomingPicks }) {
  const [filter, setFilter] = useState("all");
  const picks = incomingPicks || [];

  if (picks.length === 0) {
    return (
      <div className="text-center py-12 text-[#6E7F79] text-sm">
        No picks logged yet.
      </div>
    );
  }

  const sectorsPresent = [...new Set(picks.map(p => p.sector))];
  const filterOptions = [
    { id: "all", label: "All", count: picks.length },
    ...sectorsPresent.map(sec => ({
      id: sec.toLowerCase(),
      label: sec,
      count: picks.filter(p => p.sector === sec).length,
    })),
  ];

  const visiblePicks = picks.filter((p) =>
    filter === "all" ? true : p.sector.toLowerCase() === filter
  );

  return (
    <>
      <div className="mb-5">
        <FilterPills active={filter} onChange={setFilter} options={filterOptions} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        {visiblePicks.map((p, i) => (
          <PickCard key={p.ticker} pick={p} index={i} />
        ))}
      </div>
    </>
  );
}

// ============================================================
// Mini stat
// ============================================================

function MiniStat({ label, value, sub, tone = "default" }) {
  const color =
    tone === "positive" ? "#22946B" :
    tone === "negative" ? "#E27D6B" :
    tone === "signature" ? "#0E5E4A" :
    "#0E1B18";
  return (
    <div className="bg-white p-5 md:p-6" style={{ borderRadius: 30 }}>
      <div className="text-[10px] tracking-[0.2em] uppercase text-[#6E7F79]"
        style={{ fontWeight: 700 }}>
        {label}
      </div>
      <div className="mt-3 tabular-nums leading-none text-[28px] md:text-[36px]"
        style={{ ...HEADING, fontWeight: 500, letterSpacing: "-0.025em", color }}>
        {value}
      </div>
      {sub && <div className="mt-1.5 text-[11px] text-[#6E7F79]">{sub}</div>}
    </div>
  );
}

// ============================================================
// Chart cards — now take data from Insights endpoint
// ============================================================

function PerformanceCard({ cumulative }) {
  const data = cumulative && cumulative.length > 0 ? cumulative : [{ day: '—', ai: 0, kse: 0 }];
  return (
    <div className="bg-white p-6 md:p-7" style={{ borderRadius: 30 }}>
      <div className="mb-5">
        <div className="text-[10px] tracking-[0.2em] uppercase text-[#14735C]"
          style={{ fontWeight: 700 }}>
          Cumulative Return
        </div>
        <div className="text-[20px] md:text-[22px] mt-1 text-[#0E1B18] tracking-tight"
          style={{ ...HEADING, fontWeight: 600 }}>
          AI picks vs KSE-100
        </div>
        <div className="text-[11px] text-[#6E7F79] mt-1">
          Since tracking began · {data.length} week{data.length === 1 ? '' : 's'}
        </div>
      </div>
      <div className="h-56 md:h-64 -ml-3">
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 5, right: 8, bottom: 5, left: -10 }}>
            <XAxis dataKey="day" stroke="#6E7F79"
              tick={{ fontSize: 10, fontFamily: "JetBrains Mono" }}
              axisLine={false} tickLine={false} />
            <YAxis stroke="#6E7F79"
              tick={{ fontSize: 10, fontFamily: "JetBrains Mono" }}
              axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
            <Tooltip contentStyle={{
              background: "#0E5E4A", border: "none", borderRadius: 20,
              fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
              color: "#F1F7F3", padding: "10px 14px",
            }} labelStyle={{ color: "#7FD1AE", marginBottom: 4 }}
              itemStyle={{ color: "#F1F7F3" }} />
            <ReferenceLine y={0} stroke="#D6E3DB" strokeDasharray="2 3" />
            <Line type="monotone" dataKey="kse" stroke="#C4D2CB"
              strokeWidth={1.5} dot={false} strokeDasharray="4 4" animationDuration={1600} />
            <Line type="monotone" dataKey="ai" stroke="#0E5E4A" strokeWidth={2.5}
              animationDuration={1600}
              dot={{ fill: "#7FD1AE", stroke: "#0E5E4A", strokeWidth: 2, r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function WeeklyBarsCard({ weeklyReturns }) {
  const data = weeklyReturns && weeklyReturns.length > 0 ? weeklyReturns : [];
  return (
    <div className="bg-white p-6 md:p-7" style={{ borderRadius: 30 }}>
      <div className="mb-5">
        <div className="text-[10px] tracking-[0.2em] uppercase text-[#14735C]"
          style={{ fontWeight: 700 }}>
          Recent days
        </div>
        <div className="text-[20px] md:text-[22px] mt-1 text-[#0E1B18] tracking-tight"
          style={{ ...HEADING, fontWeight: 600 }}>
          Daily returns
        </div>
      </div>
      <div className="h-56 md:h-64 -ml-3">
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 5, right: 8, bottom: 5, left: -10 }}>
            <XAxis dataKey="day" stroke="#6E7F79"
              tick={{ fontSize: 11, fontFamily: "JetBrains Mono" }}
              axisLine={false} tickLine={false} />
            <YAxis stroke="#6E7F79"
              tick={{ fontSize: 10, fontFamily: "JetBrains Mono" }}
              axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
            <Tooltip cursor={{ fill: "rgba(127,209,174,0.10)" }}
              contentStyle={{
                background: "#0E5E4A", border: "none", borderRadius: 20,
                fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
                color: "#F1F7F3", padding: "10px 14px",
              }} labelStyle={{ color: "#7FD1AE", marginBottom: 4 }}
              itemStyle={{ color: "#F1F7F3" }} />
            <ReferenceLine y={0} stroke="#D6E3DB" />
            <Bar dataKey="ret" radius={14} animationDuration={1400}>
              {data.map((d, i) => (
                <Cell key={i} fill={d.ret >= 0 ? "#22946B" : "#E27D6B"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function BeatRateRing({ beatRate }) {
  const rate = beatRate?.percentage ?? 0;
  const wins = beatRate?.wins ?? 0;
  const total = beatRate?.total ?? 0;
  const circumference = 2 * Math.PI * 52;
  const offset = circumference * (1 - rate / 100);
  const val = useCountUp(rate);
  return (
    <div className="bg-white p-6 md:p-7 flex flex-col md:flex-row items-center gap-6"
      style={{ borderRadius: 30 }}>
      <div className="relative w-32 h-32 shrink-0">
        <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
          <circle cx="60" cy="60" r="52" stroke="#F1F7F3" strokeWidth="10" fill="none" />
          <circle cx="60" cy="60" r="52" stroke="#0E5E4A" strokeWidth="10" fill="none"
            strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 1.4s cubic-bezier(.2,.7,.2,1)" }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-[28px] tabular-nums text-[#0E1B18]"
            style={{ ...HEADING, fontWeight: 500, letterSpacing: "-0.02em" }}>
            {Math.round(val)}%
          </div>
        </div>
      </div>
      <div className="flex-1 w-full beat-rate-text">
        <div className="text-[10px] tracking-[0.2em] uppercase text-[#14735C]"
          style={{ fontWeight: 700 }}>
          Beat rate
        </div>
        <div className="text-[20px] md:text-[22px] mt-1 text-[#0E1B18] tracking-tight"
          style={{ ...HEADING, fontWeight: 600 }}>
          Picks that beat KSE-100
        </div>
        <div className="text-[13px] text-[#6E7F79] mt-2 leading-relaxed">
          {wins} of {total} picks have out-performed the index on their trading day. Target for the 8-week trial is 55%.
        </div>
      </div>
    </div>
  );
}

function BestSectorCard({ sectors }) {
  const data = sectors && sectors.length > 0 ? sectors : [];
  return (
    <div className="bg-white p-6 md:p-7" style={{ borderRadius: 30 }}>
      <div className="mb-5">
        <div className="text-[10px] tracking-[0.2em] uppercase text-[#14735C]"
          style={{ fontWeight: 700 }}>
          By sector
        </div>
        <div className="text-[20px] md:text-[22px] mt-1 text-[#0E1B18] tracking-tight"
          style={{ ...HEADING, fontWeight: 600 }}>
          Where the alpha comes from
        </div>
      </div>
      <div className="space-y-4">
        {data.length === 0 ? (
          <div className="text-[13px] text-[#6E7F79] py-4 text-center">
            Not enough data yet.
          </div>
        ) : data.map((s) => (
          <div key={s.name}>
            <div className="flex items-baseline justify-between mb-1.5">
              <div className="text-[13px] text-[#0E1B18]">{s.name}</div>
              <div className="flex items-baseline gap-3">
                <span className="text-[11px] text-[#6E7F79]">{s.picks} picks</span>
                <span className="text-[13px] tabular-nums"
                  style={{ color: s.negative ? "#E27D6B" : "#0E5E4A", ...MONO, fontWeight: 500 }}>
                  {s.avg >= 0 ? "+" : ""}{s.avg.toFixed(2)}%
                </span>
              </div>
            </div>
            <div className="h-2 rounded-full bg-[#F1F7F3] overflow-hidden">
              <div className="h-full rounded-full transition-all duration-1000"
                style={{ width: `${s.share}%`, background: s.negative ? "#E27D6B" : "#0E5E4A" }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// Weekly Summary — top of Insights
// ============================================================

function PerformerCard({ label, pick, tone }) {
  if (!pick) {
    return (
      <div className="bg-white p-6 flex-1" style={{ borderRadius: 30 }}>
        <div className="text-[10px] tracking-[0.2em] uppercase text-[#6E7F79]"
          style={{ fontWeight: 700 }}>
          {label}
        </div>
        <div className="text-[13px] text-[#6E7F79] mt-6">No data</div>
      </div>
    );
  }
  const positive = pick.ret >= 0;
  const accent = tone === 'best' ? '#22946B' : '#E27D6B';
  const bg = tone === 'best' ? 'rgba(34,148,107,0.10)' : 'rgba(226,125,107,0.10)';
  return (
    <div className="bg-white p-6 flex-1" style={{ borderRadius: 30 }}>
      <div className="flex items-center justify-between">
        <div className="text-[10px] tracking-[0.2em] uppercase"
          style={{ fontWeight: 700, color: accent }}>
          {label}
        </div>
        <span className="text-[9px] px-2.5 py-1 rounded-full tracking-wider uppercase"
          style={{ background: bg, color: accent, fontWeight: 700, ...HEADING }}>
          {pick.date}
        </span>
      </div>
      <div className="mt-5 text-[26px] md:text-[28px] leading-none text-[#0E1B18]"
        style={{ ...MONO, fontWeight: 500 }}>
        {pick.ticker}
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-[36px] md:text-[40px] tabular-nums leading-none"
          style={{ ...HEADING, fontWeight: 500, letterSpacing: "-0.025em", color: accent }}>
          {pick.ret >= 0 ? '+' : ''}{pick.ret.toFixed(2)}%
        </span>
        {pick.alpha != null && (
          <span className="text-[13px] text-[#6E7F79]" style={MONO}>
            α {pick.alpha >= 0 ? '+' : ''}{pick.alpha.toFixed(2)}
          </span>
        )}
      </div>
      <div className="mt-4 pt-4 text-[12px] text-[#6E7F79] tabular-nums"
        style={{ borderTop: "1px dashed #D6E3DB", ...MONO }}>
        {pick.entry?.toFixed(2)} → {pick.exit?.toFixed(2)}
      </div>
    </div>
  );
}

function WeeklySummaryCard({ weeks }) {
  const [selectedKey, setSelectedKey] = useState(weeks?.[0]?.weekKey || null);
  const [open, setOpen] = useState(false);

  if (!weeks || weeks.length === 0) {
    return (
      <div className="bg-white p-6 md:p-7 mb-8" style={{ borderRadius: 30 }}>
        <div className="text-[10px] tracking-[0.2em] uppercase text-[#14735C]"
          style={{ fontWeight: 700 }}>
          Weekly summary
        </div>
        <div className="text-[13px] text-[#6E7F79] mt-4 py-4 text-center">
          No completed weeks yet.
        </div>
      </div>
    );
  }

  const selected = weeks.find(w => w.weekKey === selectedKey) || weeks[0];

  return (
    <section className="mb-10 md:mb-14">
      <div className="flex items-end justify-between gap-4 mb-4 md:mb-5">
        <div>
          <div className="text-[10px] tracking-[0.22em] uppercase text-[#14735C] mb-1.5"
            style={{ fontWeight: 700 }}>
            Weekly review
          </div>
          <h2 className="text-[#0E1B18] tracking-tight leading-tight text-[22px] md:text-[28px]"
            style={{ ...HEADING, fontWeight: 600, letterSpacing: "-0.02em" }}>
            Best & worst this week
          </h2>
        </div>

        {/* Week selector */}
        <div className="relative shrink-0">
          <button
            onClick={() => setOpen(o => !o)}
            className="flex items-center gap-2 rounded-full text-[12px] px-4 py-2.5 transition-all"
            style={{
              background: "#FFFFFF", color: "#0E1B18",
              fontWeight: 500, ...HEADING,
            }}>
            {selected.weekLabel}
            <ChevronRight
              size={13}
              style={{ transform: open ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform 0.2s' }}
            />
          </button>

          {open && (
            <div className="absolute right-0 top-full mt-2 z-30 bg-white overflow-hidden"
              style={{ borderRadius: 20, boxShadow: "0 12px 32px rgba(14,94,74,0.14)", minWidth: 260 }}>
              {weeks.map(w => (
                <button
                  key={w.weekKey}
                  onClick={() => { setSelectedKey(w.weekKey); setOpen(false); }}
                  className="w-full text-left px-4 py-3 text-[13px] transition-colors hover:bg-[#F1F7F3]"
                  style={{
                    background: w.weekKey === selectedKey ? "#F1F7F3" : "transparent",
                    color: "#0E1B18",
                    fontWeight: w.weekKey === selectedKey ? 600 : 400,
                    ...HEADING,
                  }}>
                  <div>{w.weekLabel}</div>
                  <div className="text-[10px] text-[#6E7F79] mt-0.5 tabular-nums"
                    style={MONO}>
                    {w.totalPicks} picks · {w.wins}/{w.totalPicks} beats
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Best / Worst cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 mb-4 md:mb-5">
        <PerformerCard label="🏆 Best" pick={selected.best} tone="best" />
        <PerformerCard label="📉 Worst" pick={selected.worst} tone="worst" />
      </div>

      {/* Stats strip */}
      <div className="bg-white p-5 md:p-6 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6"
        style={{ borderRadius: 30 }}>
        <div>
          <div className="text-[10px] tracking-[0.2em] uppercase text-[#6E7F79]"
            style={{ fontWeight: 700 }}>
            Picks
          </div>
          <div className="mt-2 tabular-nums text-[22px] md:text-[26px] text-[#0E1B18]"
            style={{ ...HEADING, fontWeight: 500 }}>
            {selected.totalPicks}
          </div>
        </div>
        <div>
          <div className="text-[10px] tracking-[0.2em] uppercase text-[#6E7F79]"
            style={{ fontWeight: 700 }}>
            Beat rate
          </div>
          <div className="mt-2 tabular-nums text-[22px] md:text-[26px]"
            style={{ ...HEADING, fontWeight: 500, color: "#0E5E4A" }}>
            {selected.beatRate}%
          </div>
        </div>
        <div>
          <div className="text-[10px] tracking-[0.2em] uppercase text-[#6E7F79]"
            style={{ fontWeight: 700 }}>
            Avg return
          </div>
          <div className="mt-2 tabular-nums text-[22px] md:text-[26px]"
            style={{ ...HEADING, fontWeight: 500,
              color: selected.avgReturn >= 0 ? "#22946B" : "#E27D6B" }}>
            {selected.avgReturn >= 0 ? '+' : ''}{selected.avgReturn.toFixed(2)}%
          </div>
        </div>
        <div>
          <div className="text-[10px] tracking-[0.2em] uppercase text-[#6E7F79]"
            style={{ fontWeight: 700 }}>
            Avg α
          </div>
          <div className="mt-2 tabular-nums text-[22px] md:text-[26px]"
            style={{ ...HEADING, fontWeight: 500,
              color: selected.avgAlpha >= 0 ? "#0E5E4A" : "#6E7F79" }}>
            {selected.avgAlpha >= 0 ? '+' : ''}{selected.avgAlpha.toFixed(2)}
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================
// Journal rows
// ============================================================

function JournalRow({ row, showTopDivider }) {
  const [expanded, setExpanded] = useState(false);
  const retColor = row.ret >= 0 ? "#22946B" : "#E27D6B";
  const alphaColor = row.alpha != null
    ? (row.alpha >= 0 ? "#0E5E4A" : "#6E7F79")
    : "#6E7F79";

  const hasPrices = row.entry != null && row.exit != null;
  const priceChange = hasPrices ? row.exit - row.entry : null;

  const alphaLabel = row.alpha == null
    ? "Waiting on KSE-100 data"
    : row.alpha >= 0
      ? `Beat KSE-100 by ${row.alpha.toFixed(2)}%`
      : `Trailed KSE-100 by ${Math.abs(row.alpha).toFixed(2)}%`;

  const toggle = () => setExpanded(v => !v);

  return (
    <div>
      {showTopDivider && (
        <div
          className="mx-4 md:mx-6 my-2"
          style={{ height: 1, background: "rgba(14,27,24,0.06)" }}
          aria-hidden="true"
        />
      )}
      {/* Mobile — collapsed */}
      <div
        onClick={toggle}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } }}
        className="md:hidden p-4 hover:bg-[#F1F7F3] transition-colors cursor-pointer select-none"
        style={{ borderRadius: 30 }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="text-[16px] text-[#0E1B18] shrink-0"
            style={{ ...MONO, fontWeight: 500 }}>
            {row.ticker}
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <span className="tabular-nums text-[15px]"
              style={{ color: retColor, ...MONO, fontWeight: 600 }}>
              {row.ret >= 0 ? "+" : ""}{row.ret.toFixed(2)}%
            </span>
            <span className="text-[9px] px-2.5 py-1 rounded-full tracking-wider uppercase"
              style={{
                background: row.win ? "rgba(34,148,107,0.12)" : "rgba(226,125,107,0.12)",
                color: retColor, fontWeight: 700, ...HEADING,
              }}>
              {row.win ? "Beat" : "Miss"}
            </span>
            <ChevronRight
              size={14}
              style={{
                color: "#6E7F79",
                transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
                transition: "transform 0.15s ease-out",
              }}
            />
          </div>
        </div>
        <div className="mt-2 tabular-nums text-[12px] text-[#0E1B18]" style={{ ...MONO, fontWeight: 500 }}>
          {hasPrices
            ? `${row.entry.toFixed(2)} → ${row.exit.toFixed(2)}`
            : <span className="text-[#6E7F79]" style={{ fontFamily: "'Lato', sans-serif", fontWeight: 400 }}>prices pending</span>}
        </div>
        <div className="flex items-center justify-between gap-2 mt-1">
          <span className="text-[11px] text-[#6E7F79] tabular-nums" style={MONO}>
            {row.date}
          </span>
          <span className="text-[11px] text-[#6E7F79]">
            α{" "}
            <span className="tabular-nums"
              style={{ color: alphaColor, ...MONO, fontWeight: 500 }}>
              {row.alpha != null ? `${row.alpha >= 0 ? "+" : ""}${row.alpha.toFixed(2)}` : "—"}
            </span>
          </span>
        </div>
      </div>

      {/* Desktop — collapsed */}
      <div
        onClick={toggle}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } }}
        className="hidden md:grid rounded-full grid-cols-12 gap-3 px-6 py-4 items-center hover:bg-[#F1F7F3] transition-colors cursor-pointer select-none"
      >
        <div className="col-span-2 text-[12px] text-[#6E7F79] tabular-nums" style={MONO}>
          {row.date}
        </div>
        <div className="col-span-2 text-[14px] text-[#0E1B18]"
          style={{ ...MONO, fontWeight: 500 }}>
          {row.ticker}
        </div>
        <div className="col-span-3 text-right tabular-nums text-[13px] text-[#0E1B18]"
          style={{ ...MONO, fontWeight: 500 }}>
          {hasPrices
            ? `${row.entry.toFixed(2)} → ${row.exit.toFixed(2)}`
            : <span className="text-[#6E7F79]" style={{ fontFamily: "'Lato', sans-serif", fontWeight: 400 }}>—</span>}
        </div>
        <div className="col-span-2 text-right tabular-nums text-[14px]"
          style={{ color: retColor, ...MONO, fontWeight: 500 }}>
          {row.ret >= 0 ? "+" : ""}{row.ret.toFixed(2)}%
        </div>
        <div className="col-span-2 text-right tabular-nums text-[13px]"
          style={{ color: alphaColor, ...MONO }}>
          {row.alpha != null ? `${row.alpha >= 0 ? "+" : ""}${row.alpha.toFixed(2)}` : "—"}
        </div>
        <div className="col-span-1 flex justify-end items-center gap-2">
          <span className="text-[10px] px-3 py-1 rounded-full tracking-wider uppercase"
            style={{
              background: row.win ? "rgba(34,148,107,0.10)" : "rgba(226,125,107,0.10)",
              color: retColor, fontWeight: 700, ...HEADING,
            }}>
            {row.win ? "Beat" : "Miss"}
          </span>
          <ChevronRight
            size={14}
            style={{
              color: "#6E7F79",
              transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
              transition: "transform 0.15s ease-out",
            }}
          />
        </div>
      </div>

      {/* Expanded detail — both mobile and desktop */}
      {expanded && (
        <div className="mx-2 md:mx-6 mb-3 mt-1 p-4 md:p-5"
          style={{
            background: "#F1F7F3",
            borderRadius: 24,
          }}>
          {/* Header */}
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-[18px] text-[#0E1B18]" style={{ ...MONO, fontWeight: 600 }}>
                {row.ticker}
              </span>
              {row.sector && row.sector !== "Other" && (
                <span className="text-[9px] px-2.5 py-1 rounded-full tracking-wider uppercase"
                  style={{
                    background: "rgba(14,94,74,0.08)",
                    color: "#0E5E4A", fontWeight: 700, ...HEADING,
                  }}>
                  {row.sector}
                </span>
              )}
            </div>
            <span className="text-[11px] text-[#6E7F79] tabular-nums" style={MONO}>
              {row.date}
            </span>
          </div>

          {/* Prices */}
          {hasPrices ? (
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div>
                <div className="text-[9px] tracking-[0.15em] uppercase text-[#6E7F79] mb-1"
                  style={{ fontWeight: 700, ...HEADING }}>
                  Entry
                </div>
                <div className="text-[16px] text-[#0E1B18] tabular-nums"
                  style={{ ...MONO, fontWeight: 500 }}>
                  {row.entry.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-[9px] tracking-[0.15em] uppercase text-[#6E7F79] mb-1"
                  style={{ fontWeight: 700, ...HEADING }}>
                  Exit
                </div>
                <div className="text-[16px] text-[#0E1B18] tabular-nums"
                  style={{ ...MONO, fontWeight: 500 }}>
                  {row.exit.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-[9px] tracking-[0.15em] uppercase text-[#6E7F79] mb-1"
                  style={{ fontWeight: 700, ...HEADING }}>
                  Change
                </div>
                <div className="text-[16px] tabular-nums"
                  style={{ color: retColor, ...MONO, fontWeight: 500 }}>
                  {priceChange >= 0 ? "+" : ""}{priceChange.toFixed(2)}
                  <span className="text-[11px] ml-1">
                    ({row.ret >= 0 ? "+" : ""}{row.ret.toFixed(2)}%)
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-[13px] text-[#6E7F79] mb-3">
              Prices pending — will fill once Workflows C and D run.
            </div>
          )}

          {/* Alpha line */}
          <div className="pt-3 flex items-center justify-between gap-2"
            style={{ borderTop: "1px solid rgba(14,94,74,0.10)" }}>
            <span className="text-[12px] text-[#6E7F79]">
              vs KSE-100
            </span>
            <span className="text-[12px]" style={{ color: alphaColor, fontWeight: 500 }}>
              {alphaLabel}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function JournalRows({ rows }) {
  if (!rows || rows.length === 0) {
    return (
      <div className="bg-white p-8 text-center text-[#6E7F79] text-sm"
        style={{ borderRadius: 30 }}>
        No picks logged yet.
      </div>
    );
  }
  return (
    <div className="bg-white p-3 md:p-4 space-y-1" style={{ borderRadius: 30 }}>
      <div className="hidden md:grid grid-cols-12 gap-3 px-6 py-3 text-[10px] tracking-[0.15em] uppercase text-[#6E7F79]"
        style={{ fontWeight: 700 }}>
        <div className="col-span-2">Date</div>
        <div className="col-span-2">Ticker</div>
        <div className="col-span-3 text-right">Entry → Exit</div>
        <div className="col-span-2 text-right">Return</div>
        <div className="col-span-2 text-right flex items-center justify-end gap-1">
          <InfoTooltip content="Alpha (α) is your pick's return minus the KSE-100's return over the same period. Positive α means you beat the market.">
            <span>α</span>
          </InfoTooltip>
        </div>
        <div className="col-span-1 text-right">Result</div>
      </div>
      {rows.map((row, i) => (
        <JournalRow key={i} row={row} showTopDivider={i > 0} />
      ))}
    </div>
  );
}

function WorkflowHealthCompact() {
  return (
    <div className="bg-white p-5 md:p-6 flex items-center gap-4" style={{ borderRadius: 30 }}>
      <div className="w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center shrink-0"
        style={{ background: "#F1F7F3" }}>
        <Check size={22} color="#22946B" strokeWidth={2.5} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[14px] md:text-[15px] text-[#0E1B18]" style={{ fontWeight: 700 }}>
          All 4 workflows healthy
        </div>
        <div className="text-[11px] md:text-[12px] text-[#6E7F79] mt-1 truncate">
          Daily Brief · Entry Logger · Exit Logger · Weekly Review
        </div>
      </div>
      <div className="text-right hidden sm:block shrink-0">
        <div className="text-[10px] uppercase tracking-wider text-[#22946B]"
          style={{ fontWeight: 700 }}>
          Live
        </div>
        <div className="text-[11px] text-[#6E7F79] mt-0.5 tabular-nums" style={MONO}>
          09:47 PKT
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Views
// ============================================================

function DashboardView({ time, marketOpen, onView, todayData, todayLoading, todayError, journalData, insightsData }) {
  if (todayLoading) return <LoadingState message="Loading picks…" />;
  if (todayError) return <ErrorState error={todayError} />;

  const recentPicks = journalData?.picks?.slice(0, 5) || [];

  return (
    <>
      <Greeting time={time} marketOpen={marketOpen} />
      <SessionBanner message={todayData?.sessionMessage} />
      <AlphaHero data={todayData} />

      <section className="mt-10 md:mt-14">
        <SectionHeader eyebrow={`${todayData?.date ?? ''} · Trading day`} title="Today's picks" />
        <TodayPicks picks={todayData?.picks} />
      </section>

      <section className="mt-10 md:mt-14">
        <SectionHeader
          eyebrow="4-week overview"
          title="The bigger picture"
          action={{ label: "See insights", onClick: () => onView("insights") }}
        />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5">
          <PerformanceCard cumulative={insightsData?.cumulative} />
          <WeeklyBarsCard weeklyReturns={insightsData?.weeklyReturns} />
        </div>
      </section>

      <section className="mt-10 md:mt-14">
        <SectionHeader
          eyebrow="Journal"
          title="Recent picks"
          action={{ label: "See all", onClick: () => onView("journal") }}
        />
        <JournalRows rows={recentPicks} />
      </section>

      <section className="mt-10 md:mt-14">
        <SectionHeader
          eyebrow="System"
          title="Workflow health"
          action={{ label: "See details", onClick: () => onView("profile") }}
        />
        <WorkflowHealthCompact />
      </section>
    </>
  );
}

function JournalView({ data, loading, error }) {
  const [timeFilter, setTimeFilter] = useState("all");
  const [resultFilter, setResultFilter] = useState("all");
  const [sectorFilter, setSectorFilter] = useState("all");
  const [search, setSearch] = useState("");

  if (loading) return <LoadingState message="Loading journal…" />;
  if (error) return <ErrorState error={error} />;

  const allPicks = data?.picks || [];

  // Time filter helpers
  const now = new Date();
  const pkt = new Date(now.getTime() + 5 * 60 * 60 * 1000);
  const dayOfWeek = pkt.getUTCDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(pkt.getTime() - daysToMonday * 86400000);
  const mondayStr = `${monday.getUTCFullYear()}-${String(monday.getUTCMonth() + 1).padStart(2, '0')}-${String(monday.getUTCDate()).padStart(2, '0')}`;
  const fourWeeksAgo = new Date(pkt.getTime() - 28 * 86400000);
  const fourWeeksAgoStr = `${fourWeeksAgo.getUTCFullYear()}-${String(fourWeeksAgo.getUTCMonth() + 1).padStart(2, '0')}-${String(fourWeeksAgo.getUTCDate()).padStart(2, '0')}`;

  const searchTrimmed = search.trim().toLowerCase();

  // Apply filters
  const filteredPicks = allPicks.filter(p => {
    if (timeFilter === "week" && p.dateSort < mondayStr) return false;
    if (timeFilter === "4weeks" && p.dateSort < fourWeeksAgoStr) return false;
    if (resultFilter === "beat" && !p.win) return false;
    if (resultFilter === "miss" && p.win) return false;
    if (sectorFilter !== "all" && (p.sector || '').toLowerCase() !== sectorFilter) return false;
    if (searchTrimmed && !p.ticker.toLowerCase().includes(searchTrimmed)) return false;
    return true;
  });

  // Compute filtered stats
  const filteredWins = filteredPicks.filter(p => p.win).length;
  const filteredMisses = filteredPicks.length - filteredWins;
  const picksWithAlpha = filteredPicks.filter(p => p.alpha != null);
  const filteredAvgAlpha = picksWithAlpha.length > 0
    ? picksWithAlpha.reduce((s, p) => s + p.alpha, 0) / picksWithAlpha.length
    : 0;

  // Sector options from all picks
  const sectorsPresent = [...new Set(allPicks.map(p => p.sector).filter(Boolean))];

  const timeOptions = [
    { id: "all", label: "All time" },
    { id: "week", label: "This week" },
    { id: "4weeks", label: "Last 4 weeks" },
  ];
  const resultOptions = [
    { id: "all", label: "All" },
    { id: "beat", label: "Beats" },
    { id: "miss", label: "Misses" },
  ];
  const sectorOptions = [
    { id: "all", label: "All sectors" },
    ...sectorsPresent.map(s => ({ id: s.toLowerCase(), label: s })),
  ];

  const isFiltered = timeFilter !== "all" || resultFilter !== "all" || sectorFilter !== "all" || searchTrimmed !== "";

  return (
    <>
      <ViewHeader
        eyebrow="Journal"
        title="All picks."
        subtitle="Every call the agent has made since tracking began."
      />

      {/* Search */}
      <div className="mb-3">
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search ticker (e.g. OGDC)"
            className="w-full text-[13px] rounded-full pl-10 pr-4 py-3 outline-none transition-shadow focus:shadow-[0_0_0_2px_rgba(127,209,174,0.35)]"
            style={{
              background: "#FFFFFF",
              color: "#0E1B18",
              border: "none",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          />
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6E7F79] text-[13px]">
            🔍
          </div>
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[16px] text-[#6E7F79] hover:text-[#0E1B18] leading-none"
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Filter dropdowns */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <FilterDropdown label="Time" active={timeFilter} options={timeOptions} onChange={setTimeFilter} />
        <FilterDropdown label="Result" active={resultFilter} options={resultOptions} onChange={setResultFilter} />
        {sectorsPresent.length > 1 && (
          <FilterDropdown label="Sector" active={sectorFilter} options={sectorOptions} onChange={setSectorFilter} />
        )}
        {isFiltered && (
          <button
            onClick={() => {
              setTimeFilter("all");
              setResultFilter("all");
              setSectorFilter("all");
              setSearch("");
            }}
            className="text-[12px] rounded-full px-4 py-2.5 transition-colors"
            style={{
              background: "transparent", color: "#14735C",
              fontWeight: 600, ...HEADING,
            }}>
            Clear all
          </button>
        )}
      </div>

      {/* Stats — reflect filtered set */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
        <MiniStat
          label={isFiltered ? "Filtered picks" : "Total picks"}
          value={filteredPicks.length}
        />
        <MiniStat label="Wins" value={filteredWins} tone="positive" />
        <MiniStat label="Misses" value={filteredMisses} tone="negative" />
        <MiniStat label="Avg α"
          value={`${filteredAvgAlpha >= 0 ? "+" : ""}${filteredAvgAlpha.toFixed(2)}`}
          tone="signature" />
      </div>

      {/* Empty state */}
      {isFiltered && filteredPicks.length === 0 ? (
        <div className="bg-white p-8 text-center" style={{ borderRadius: 30 }}>
          <div className="text-[13px] text-[#6E7F79] mb-3">
            No picks match these filters.
          </div>
          <button
            onClick={() => {
              setTimeFilter("all");
              setResultFilter("all");
              setSectorFilter("all");
              setSearch("");
            }}
            className="text-[12px] rounded-full px-4 py-2 transition-colors"
            style={{
              background: "#F1F7F3", color: "#14735C",
              fontWeight: 600, ...HEADING,
            }}>
            Clear filters
          </button>
        </div>
      ) : (
        <JournalRows rows={filteredPicks} />
      )}
    </>
  );
}

function InsightsView({ data, loading, error }) {
  if (loading) return <LoadingState message="Loading insights…" />;
  if (error) return <ErrorState error={error} />;

  return (
    <>
      <ViewHeader
        eyebrow="Insights"
        title="The bigger picture."
        subtitle="How the AI has performed since tracking began."
      />
      <WeeklySummaryCard weeks={data?.weeks} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5">
        <PerformanceCard cumulative={data?.cumulative} />
        <WeeklyBarsCard weeklyReturns={data?.weeklyReturns} />
        <BeatRateRing beatRate={data?.beatRate} />
        <BestSectorCard sectors={data?.sectors} />
      </div>
    </>
  );
}

function ProfileView() {
  return (
    <>
      <ViewHeader
        eyebrow="Profile"
        title="You & the system."
        subtitle="Account, delivery, and workflow health."
      />

      <div className="p-6 md:p-8 mb-4 md:mb-5 relative overflow-hidden"
        style={{ background: "#0E5E4A", borderRadius: 30 }}>
        <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full opacity-25 blur-3xl pointer-events-none"
          style={{ background: "#7FD1AE" }} />
        <div className="relative flex items-center gap-5">
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center shrink-0"
            style={{ background: "#7FD1AE" }}>
            <span className="text-[28px] md:text-[32px] text-[#0E1B18]"
              style={{ ...HEADING, fontWeight: 700 }}>R</span>
          </div>
          <div className="min-w-0">
            <div className="text-white text-[22px] md:text-[28px] tracking-tight leading-tight"
              style={{ ...HEADING, fontWeight: 600 }}>Rizwan</div>
            <div className="text-[11px] text-[#7FD1AE] mt-1 tracking-wider uppercase"
              style={{ fontWeight: 700 }}>Beginner investor · Karachi</div>
            <div className="text-[12px] text-white/70 mt-2">
              Day 28 of 56 · trial in progress
            </div>
          </div>
        </div>
        <div className="relative mt-6 pt-5 border-t border-white/10">
          <div className="flex items-baseline justify-between text-[11px] mb-2">
            <span className="text-white/60 tracking-wider uppercase"
              style={{ fontWeight: 700 }}>8-week trial</span>
            <span className="text-[#7FD1AE] tabular-nums" style={MONO}>50%</span>
          </div>
          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full rounded-full"
              style={{ width: "50%", background: "#7FD1AE" }} />
          </div>
        </div>
      </div>

      <div className="bg-white p-6 md:p-7 mb-4 md:mb-5" style={{ borderRadius: 30 }}>
        <div className="mb-5">
          <div className="text-[10px] tracking-[0.2em] uppercase text-[#14735C]"
            style={{ fontWeight: 700 }}>Workflows</div>
          <div className="text-[20px] md:text-[22px] mt-1 text-[#0E1B18] tracking-tight"
            style={{ ...HEADING, fontWeight: 600 }}>n8n health</div>
        </div>
        <div className="space-y-3">
          {WORKFLOWS.map((wf) => (
            <div key={wf.name}
              className="p-4 md:p-5 flex items-center gap-4"
              style={{ background: "#F1F7F3", borderRadius: 24 }}>
              <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
                style={{ background: "#FFFFFF" }}>
                <Check size={17} color="#22946B" strokeWidth={2.5} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[14px] text-[#0E1B18]" style={{ fontWeight: 700 }}>
                  {wf.name}
                </div>
                <div className="text-[11px] text-[#6E7F79] mt-0.5 truncate">
                  {wf.schedule}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-[10px] uppercase tracking-wider text-[#22946B]"
                  style={{ fontWeight: 700 }}>Healthy</div>
                <div className="text-[11px] text-[#6E7F79] mt-0.5 tabular-nums"
                  style={MONO}>{wf.last}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white p-6 md:p-7" style={{ borderRadius: 30 }}>
        <div className="mb-5">
          <div className="text-[10px] tracking-[0.2em] uppercase text-[#14735C]"
            style={{ fontWeight: 700 }}>Delivery</div>
          <div className="text-[20px] md:text-[22px] mt-1 text-[#0E1B18] tracking-tight"
            style={{ ...HEADING, fontWeight: 600 }}>Where briefs arrive</div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-5 flex items-center gap-4"
            style={{ background: "#F1F7F3", borderRadius: 24 }}>
            <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
              style={{ background: "#7FD1AE" }}>
              <Radio size={17} color="#0E1B18" strokeWidth={2} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[14px] text-[#0E1B18]" style={{ fontWeight: 700 }}>Discord</div>
              <div className="text-[11px] text-[#6E7F79] mt-0.5">Primary · webhook active</div>
            </div>
            <span className="text-[10px] px-3 py-1 rounded-full tracking-wider uppercase"
              style={{ background: "rgba(34,148,107,0.15)", color: "#22946B", fontWeight: 700, ...HEADING }}>
              On
            </span>
          </div>
          <div className="p-5 flex items-center gap-4"
            style={{ background: "#F1F7F3", borderRadius: 24 }}>
            <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
              style={{ background: "#FFFFFF" }}>
              <Radio size={17} color="#6E7F79" strokeWidth={2} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[14px] text-[#0E1B18]" style={{ fontWeight: 700 }}>Telegram</div>
              <div className="text-[11px] text-[#6E7F79] mt-0.5">Fallback · VPN required</div>
            </div>
            <span className="text-[10px] px-3 py-1 rounded-full tracking-wider uppercase"
              style={{ background: "rgba(110,127,121,0.12)", color: "#6E7F79", fontWeight: 700, ...HEADING }}>
              Standby
            </span>
          </div>
        </div>
      </div>
    </>
  );
}

// ============================================================
// Main
// ============================================================

export default function PSXAlphaDashboard() {
  const [view, setView] = useState("dashboard");
  const [time, setTime] = useState("");
  const [scrollState, setScrollState] = useState("initial");
  const lastScrollY = useRef(0);

  const today    = useApi(import.meta.env.VITE_API_URL);
  const journal  = useApi(import.meta.env.VITE_JOURNAL_URL);
  const insights = useApi(import.meta.env.VITE_INSIGHTS_URL);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString("en-GB", {
        hour: "2-digit", minute: "2-digit", hour12: false,
      }));
    };
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [view]);

  // Scroll-driven state for the floating pill nav:
  //  - initial:   at top of page, original header visible, pill hidden
  //  - collapsed: scrolled down, pill visible with nav only
  //  - expanded:  scrolled down + scrolling up, pill expands to include logo + status
  useEffect(() => {
    const HEADER_HEIGHT = 120;     // approx height of original header + top padding
    const DELTA_THRESHOLD = 6;     // ignore trackpad/mouse jitter under this

    const handleScroll = () => {
      const y = window.scrollY;
      const delta = y - lastScrollY.current;

      if (y < HEADER_HEIGHT) {
        setScrollState("initial");
      } else if (Math.abs(delta) > DELTA_THRESHOLD) {
        setScrollState(delta > 0 ? "collapsed" : "expanded");
      }
      lastScrollY.current = y;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Reset to initial state when switching views (since scrollTo top happens)
  useEffect(() => {
    setScrollState("initial");
    lastScrollY.current = 0;
  }, [view]);

  return (
    <div className="min-h-screen pb-44 md:pb-10"
      style={{ background: "#E8F1EC", color: "#0E1B18" }}>
      <FloatingPillNav
        view={view}
        onView={setView}
        scrollState={scrollState}
        marketOpen={today.data?.marketOpen ?? false}
        time={time}
      />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&family=Lato:wght@300;400;700;900&family=JetBrains+Mono:wght@400;500&display=swap');
        body { font-family: 'Lato', system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes viewIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-view-in { animation: viewIn 0.5s cubic-bezier(.2,.7,.2,1); }
        .beat-rate-text { text-align: center; }
        @media (min-width: 768px) {
          .beat-rate-text { text-align: left; }
        }
      `}</style>

      <div className="px-4 md:px-8 lg:px-12 pt-5 md:pt-8">
        <Header
          view={view}
          onView={setView}
          time={time}
          marketOpen={today.data?.marketOpen ?? false}
        />

        <main key={view} className="animate-view-in">
          {view === "dashboard" && (
            <DashboardView
              time={time}
              marketOpen={today.data?.marketOpen ?? false}
              onView={setView}
              todayData={today.data}
              todayLoading={today.loading}
              todayError={today.error}
              journalData={journal.data}
              insightsData={insights.data}
            />
          )}
          {view === "journal" && (
            <JournalView
              data={journal.data}
              loading={journal.loading}
              error={journal.error}
            />
          )}
          {view === "insights" && (
            <InsightsView
              data={insights.data}
              loading={insights.loading}
              error={insights.error}
            />
          )}
          {view === "profile" && <ProfileView />}
        </main>

        <footer className="mt-12 pt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-2 text-[11px] text-[#6E7F79]">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#22946B" }} />
            System healthy · last sync {today.data?.lastSync ?? '—'} PKT
          </div>
          <div className="tracking-wider uppercase" style={{ fontWeight: 700 }}>
            Reasoning aid · not investment advice
          </div>
        </footer>
      </div>

      <BottomNav view={view} onView={setView} />
    </div>
  );
}
