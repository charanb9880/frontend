// Dashboard.jsx — FULL file with WebSocket, tooltips, sorting, theme toggle
import React, { useEffect, useState, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { createChart } from "lightweight-charts";
import { motion } from "framer-motion";

const API = import.meta.env.VITE_API_URL;
const WS_URL = import.meta.env.VITE_WS_URL || ""; // set this in env if you have a websocket

function Card({ children, className = "" }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-5 rounded-xl bg-gray-900/60 border border-gray-800 ${className}`}
    >
      {children}
    </motion.div>
  );
}

/* ============================
   MiniTrend (SVG) with tooltip
   - points: array of numbers
   - rising: bool
============================= */
function MiniTrend({ points = [], rising = true, symbol = "" }) {
  const containerRef = useRef(null);
  const tooltipRef = useRef(null);

  // Build point string for polyline
  const normalizedPoints = useMemo(() => {
    if (!points || points.length < 2) return [];
    const max = Math.max(...points);
    const min = Math.min(...points);
    const range = max - min || 1;
    return points.map((p, i) => {
      const x = (i / (points.length - 1)) * 100;
      const y = 100 - ((p - min) / range) * 100;
      return `${x},${y}`;
    });
  }, [points]);

  function handleMouseMove(e) {
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = x / rect.width;
    const idx = Math.round((points.length - 1) * pct);
    const clamped = Math.max(0, Math.min(points.length - 1, idx));
    const val = points[clamped];
    if (!tooltipRef.current) return;
    tooltipRef.current.style.display = "block";
    tooltipRef.current.style.left = `${Math.min(rect.width - 120, Math.max(4, x - 60))}px`;
    tooltipRef.current.style.top = `${-40}px`;
    tooltipRef.current.innerHTML = `
      <div style="font-size:12px;font-weight:600;">${symbol}</div>
      <div style="font-size:12px">${val != null ? "$" + Number(val).toFixed(2) : "-"}</div>
    `;
  }

  function handleMouseLeave() {
    if (tooltipRef.current) tooltipRef.current.style.display = "none";
  }

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ position: "relative", width: 110, height: 30 }}
    >
      <div
        ref={tooltipRef}
        style={{
          position: "absolute",
          display: "none",
          pointerEvents: "none",
          background: "rgba(15,23,42,0.95)",
          color: "white",
          padding: "6px 8px",
          borderRadius: 6,
          fontSize: 12,
          transform: "translateY(-6px)",
          boxShadow: "0 6px 18px rgba(2,6,23,0.6)",
          zIndex: 50,
        }}
      />
      <svg width="100" height="30" viewBox="0 0 100 100" className="overflow-visible">
        <polyline
          fill="none"
          stroke={rising ? "#22c55e" : "#ef4444"}
          strokeWidth="3"
          strokeLinecap="round"
          points={normalizedPoints.join(" ")}
        />
      </svg>
    </div>
  );
}

/* ============================
   Main Dashboard component
============================= */
export default function Dashboard() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  // portfolio & system
  const [data, setData] = useState({ virtual_cash: 0, positions: [], status: "PENDING" });
  const [sys, setSys] = useState({ trading_enabled: false });

  // market state
  const [market, setMarket] = useState([]); // array of { symbol, current_price }
  const [previousMarket, setPreviousMarket] = useState({}); // {symbol: price}
  const [marketHistory, setMarketHistory] = useState({}); // {symbol: [price,...]}
  const [popup, setPopup] = useState("");

  // chart / candles
  const [candleData, setCandleData] = useState([]);
  const chartRef = useRef(null);
  const chartObj = useRef(null);

  // sorting
  const [sortKey, setSortKey] = useState("symbol"); // "symbol" | "price" | "trend"
  const [sortDir, setSortDir] = useState("asc"); // "asc" | "desc"

  // theme
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "dark");

  // helper: apply theme class to body
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "light") {
      root.classList.add("light-theme");
    } else {
      root.classList.remove("light-theme");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  // fetch + websocket integration
  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    let ws;
    let polling = false;
    let mounted = true;

    async function initialLoad() {
      try {
        const sysR = await fetch(`${API}/api/system`).then((r) => r.json());
        if (!mounted) return;
        setSys(sysR);

        const pf = await fetch(`${API}/api/portfolio`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then((r) => r.json());
        if (!mounted) return;
        setData(pf);

        const m = await fetch(`${API}/api/prices`).then((r) => r.json());
        if (!mounted) return {
          /* continue */
        };

        // populate previousMarket (if empty)
        setPreviousMarket((prev) => {
          const map = { ...prev };
          (Array.isArray(m) ? m : []).forEach((x) => {
            if (!map[x.symbol]) map[x.symbol] = x.current_price;
          });
          return map;
        });

        // populate marketHistory
        setMarketHistory((prev) => {
          const newH = { ...prev };
          (Array.isArray(m) ? m : []).forEach((x) => {
            if (!newH[x.symbol]) newH[x.symbol] = [];
            newH[x.symbol].push(Number(x.current_price));
            if (newH[x.symbol].length > 20) newH[x.symbol].shift();
          });
          return newH;
        });

        setMarket(Array.isArray(m) ? m : []);
      } catch (err) {
        if (mounted) setPopup(err.message || "Load failed");
      }
    }

    initialLoad();

    // If WS_URL present — open websocket
    if (WS_URL) {
      try {
        ws = new WebSocket(WS_URL);

        ws.onopen = () => {
          console.info("WS connected:", WS_URL);
          // if server expects a subscribe message, send one — adjust if needed
          // ws.send(JSON.stringify({ type: "subscribe", channel: "prices" }));
        };

        ws.onmessage = (ev) => {
          try {
            const msg = JSON.parse(ev.data);
            // Expect messages like: { symbol: "AAPL", current_price: 123.45 }
            if (!msg || !msg.symbol) return;
            setMarket((prev) => {
              const existing = prev.find((p) => p.symbol === msg.symbol);
              if (existing) {
                return prev.map((p) => (p.symbol === msg.symbol ? { ...p, current_price: msg.current_price } : p));
              } else {
                return [...prev, { symbol: msg.symbol, current_price: msg.current_price }];
              }
            });

            // update previousMarket & history
            setPreviousMarket((prev) => ({ ...prev, [msg.symbol]: prev[msg.symbol] ?? msg.current_price }));
            setMarketHistory((prev) => {
              const h = { ...prev };
              if (!h[msg.symbol]) h[msg.symbol] = [];
              h[msg.symbol].push(Number(msg.current_price));
              if (h[msg.symbol].length > 20) h[msg.symbol].shift();
              return h;
            });
          } catch (e) {
            console.warn("WS parse error", e);
          }
        };

        ws.onerror = (e) => {
          console.warn("WS error", e);
        };

        ws.onclose = () => {
          console.info("WS closed");
          // fallback to polling if closed
          polling = true;
        };
      } catch (e) {
        console.warn("WS connect failed:", e);
        polling = true;
      }
    } else {
      polling = true;
    }

    // Polling fallback: every 4s
    let pollId;
    if (polling) {
      pollId = setInterval(async () => {
        try {
          const m = await fetch(`${API}/api/prices`).then((r) => r.json());
          // update previousMarket using last known values
          setPreviousMarket((prev) => {
            const map = { ...prev };
            (Array.isArray(m) ? m : []).forEach((x) => {
              if (!map[x.symbol]) map[x.symbol] = x.current_price;
            });
            return map;
          });
          // update history
          setMarketHistory((prev) => {
            const newH = { ...prev };
            (Array.isArray(m) ? m : []).forEach((x) => {
              if (!newH[x.symbol]) newH[x.symbol] = [];
              newH[x.symbol].push(Number(x.current_price));
              if (newH[x.symbol].length > 20) newH[x.symbol].shift();
            });
            return newH;
          });
          setMarket(Array.isArray(m) ? m : []);
        } catch (e) {
          console.warn("poll error", e);
        }
      }, 4000);
    }

    // cleanup
    return () => {
      mounted = false;
      if (ws && ws.readyState === WebSocket.OPEN) ws.close();
      if (pollId) clearInterval(pollId);
    };
  }, [token, navigate]);

  // Trading execution
  async function trade(kind, sym, quantity) {
    if (role === "ADMIN") return alert("Admins cannot trade!");
    try {
      const r = await fetch(`${API}/api/trade/${kind}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: sym, quantity: Number(quantity) }),
      });
      const j = await r.json();
      if (!r.ok) return setPopup(j.error || "Trade failed");
      const pf = await fetch(`${API}/api/portfolio`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json());
      setData(pf);
    } catch (e) {
      setPopup(e.message || "Trade error");
    }
  }

  // Candle chart loader (kept)
  function loadCandles(sym) {
    fetch(`${API}/api/candles/${sym}`).then((r) => r.json()).then((res) => setCandleData(Array.isArray(res) ? res : []));
  }

  // Candlestick render (kept)
  useEffect(() => {
    if (!chartRef.current || candleData.length === 0) return;
    if (chartObj.current) chartObj.current.remove();
    const chart = createChart(chartRef.current, {
      width: chartRef.current.clientWidth,
      height: 320,
      layout: { background: { color: "#0f1114" }, textColor: "#d1d5db" },
      grid: { vertLines: { color: "#1f2937" }, horzLines: { color: "#1f2937" } },
    });
    const candleSeries = chart.addSeries({ type: "candlestick", upColor: "#16a34a", downColor: "#dc2626" });
    candleSeries.setData(candleData.map((d) => ({ time: d.time, open: Number(d.open), high: Number(d.high), low: Number(d.low), close: Number(d.close) })));
    chartObj.current = chart;
  }, [candleData]);

  // Sorting helper
  const sortedMarket = useMemo(() => {
    const copy = [...market];
    const computeTrend = (m) => {
      const prev = Number(previousMarket[m.symbol] ?? m.current_price);
      const diff = Number(m.current_price) - prev;
      const pct = prev > 0 ? (diff / prev) * 100 : 0;
      return pct;
    };

    copy.sort((a, b) => {
      if (sortKey === "symbol") {
        return sortDir === "asc" ? a.symbol.localeCompare(b.symbol) : b.symbol.localeCompare(a.symbol);
      }
      if (sortKey === "price") {
        return sortDir === "asc" ? Number(a.current_price) - Number(b.current_price) : Number(b.current_price) - Number(a.current_price);
      }
      // trend
      const ta = computeTrend(a);
      const tb = computeTrend(b);
      return sortDir === "asc" ? ta - tb : tb - ta;
    });
    return copy;
  }, [market, previousMarket, sortKey, sortDir]);

  // UI helpers
  function toggleSort(key) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  function formatPct(current, prev) {
    const diff = current - prev;
    const pct = prev > 0 ? ((diff / prev) * 100).toFixed(2) : "0.00";
    return { diff, pct: Number(pct) };
  }

  // portfolio P/L helper (kept simple)
  function pl(p) {
    const cost = Number(p.average_price) * Number(p.quantity);
    const mkt = Number(p.current_price) * Number(p.quantity);
    const diff = mkt - cost;
    return { cost, mkt, diff };
  }

  return (
    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="grid gap-5 p-5 text-white bg-gray-950 min-h-screen">
      {/* Popup */}
      {popup && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-600 w-72 text-center">
            <div>{popup}</div>
            <button className="mt-3 w-full bg-red-600 py-2 rounded" onClick={() => setPopup("")}>
              Close
            </button>
          </div>
        </div>
      )}

      {/* Header row — status + theme + sorting */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-3 items-center">
          <div className={`px-3 py-1 rounded-full text-xs ${sys.trading_enabled ? "bg-green-600/20" : "bg-yellow-600/20"}`}>
            {sys.trading_enabled ? "Trading Open" : "Trading Paused"}
          </div>
          <div className={`px-3 py-1 rounded-full text-xs ${data.status === "APPROVED" ? "bg-green-600/20" : "bg-orange-600/20"}`}>
            {data.status === "APPROVED" ? "Approved" : "Awaiting Approval"}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Sorting controls */}
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <div>Sort:</div>
            <button onClick={() => toggleSort("symbol")} className={`px-2 py-1 rounded ${sortKey === "symbol" ? "bg-gray-800" : "bg-gray-700"}`}>Symbol</button>
            <button onClick={() => toggleSort("price")} className={`px-2 py-1 rounded ${sortKey === "price" ? "bg-gray-800" : "bg-gray-700"}`}>Price</button>
            <button onClick={() => toggleSort("trend")} className={`px-2 py-1 rounded ${sortKey === "trend" ? "bg-gray-800" : "bg-gray-700"}`}>Trend</button>
          </div>

          {/* Theme toggle */}
          <button
            onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
            className="px-3 py-1 rounded bg-gray-800 text-sm"
            title="Toggle theme"
          >
            {theme === "dark" ? "Light" : "Dark"}
          </button>
        </div>
      </div>

      {/* Cash card */}
      <Card>
        <div className="text-2xl font-bold">Virtual Cash: ${Number(data.virtual_cash).toFixed(2)}</div>
      </Card>

      {/* Trade panel */}
      {role !== "ADMIN" && (
        <Card>
          <div className="font-semibold mb-2">Trade</div>
          <div className="flex flex-wrap gap-3 items-center">
            <input placeholder="Symbol" defaultValue="AAPL" onChange={(e) => { /* user can type in the input before using prompt-based market buy/sell */ }} className="px-3 py-2 bg-gray-800 rounded border border-gray-700" />
            <div className="text-sm text-gray-400">Quick market buys/sells available in the Market table</div>
          </div>
        </Card>
      )}

      {/* Portfolio */}
      {data.positions?.length > 0 && (
        <Card>
          <div className="font-semibold mb-3">Trade Summary</div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400">
                <th className="pb-2 text-left">Symbol</th>
                <th className="pb-2 text-left">Qty</th>
                <th className="pb-2 text-left">Avg Buy</th>
                <th className="pb-2 text-left">Current</th>
                <th className="pb-2 text-right">P/L</th>
              </tr>
            </thead>
            <tbody>
              {data.positions.map((p) => {
                const { diff } = pl(p);
                const profit = diff >= 0;
                return (
                  <tr key={p.symbol} className="border-t border-gray-800">
                    <td className="py-2">{p.symbol}</td>
                    <td>{p.quantity}</td>
                    <td>${Number(p.average_price).toFixed(2)}</td>
                    <td>${Number(p.current_price).toFixed(2)}</td>
                    <td className={`text-right font-bold ${profit ? "text-green-400" : "text-red-400"}`}>{profit ? "▲" : "▼"} ${diff.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      {/* Market */}
      <Card>
        <div className="font-semibold mb-2">Market</div>

        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400">
              <th className="p-2 text-left">Symbol</th>
              <th className="p-2 text-left cursor-pointer" onClick={() => toggleSort("price")}>Price</th>
              <th className="p-2 text-left cursor-pointer" onClick={() => toggleSort("trend")}>Trend</th>
              <th className="p-2 text-left">Line</th>
              <th className="p-2 text-right"></th>
            </tr>
          </thead>

          <tbody>
            {sortedMarket.map((m) => {
              const current = Number(m.current_price);
              const prev = Number(previousMarket[m.symbol] ?? current);
              const { diff, pct } = formatPct(current, prev);
              const rising = diff >= 0;
              const history = marketHistory[m.symbol] || [];

              return (
                <tr key={m.symbol} className="border-t border-gray-800">
                  <td className="p-2">{m.symbol}</td>
                  <td className="p-2">${current.toFixed(2)}</td>

                  <td className={`p-2 font-bold ${rising ? "text-green-400" : "text-red-400"}`}>
                    {rising ? "▲" : "▼"} {pct}%
                  </td>

                  <td className="p-2">
                    <MiniTrend points={history} rising={rising} symbol={m.symbol} />
                  </td>

                  <td className="p-2 text-right flex gap-2 justify-end">
                    {role !== "ADMIN" && (
                      <>
                        <button onClick={() => {
                          const q = prompt(`Buy how many shares of ${m.symbol}?`);
                          if (q) trade("buy", m.symbol, q);
                        }} className="px-3 py-1 bg-green-600 rounded">Buy</button>

                        <button onClick={() => {
                          const q = prompt(`Sell how many shares of ${m.symbol}?`);
                          if (q) trade("sell", m.symbol, q);
                        }} className="px-3 py-1 bg-red-600 rounded">Sell</button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {/* Candlestick Chart (remains optional) */}
      {candleData.length > 0 && (
        <Card>
          <div className="font-semibold mb-2">Candlestick Chart</div>
          <div ref={chartRef} className="w-full h-80"></div>
        </Card>
      )}
    </motion.div>
  );
}
