import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { createChart } from "lightweight-charts";
import { motion } from "framer-motion";

const API = import.meta.env.VITE_API_URL;

function Card({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-5 rounded-xl bg-gray-900/60 border border-gray-800"
    >
      {children}
    </motion.div>
  );
}

/* ===========================
   MINI TREND LINE (Sparkline)
=========================== */
function MiniTrend({ points, rising }) {
  if (!points || points.length < 2) return <div style={{ height: 30 }}></div>;

  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;

  const normalized = points.map((p, i) => {
    const x = (i / (points.length - 1)) * 100;
    const y = 100 - ((p - min) / range) * 100;
    return `${x},${y}`;
  });

  return (
    <svg width="100" height="30" viewBox="0 0 100 100">
      <polyline
        fill="none"
        stroke={rising ? "#22c55e" : "#ef4444"}
        strokeWidth="3"
        points={normalized.join(" ")}
      />
    </svg>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  const [data, setData] = useState({ virtual_cash: 0, positions: [], status: "PENDING" });
  const [sys, setSys] = useState({ trading_enabled: false });
  const [market, setMarket] = useState([]);
  const [previousMarket, setPreviousMarket] = useState({});
  const [marketHistory, setMarketHistory] = useState({});
  const [tradeHistory, setTradeHistory] = useState([]);

  const [popup, setPopup] = useState("");

  // Candle chart
  const [symbol, setSymbol] = useState("AAPL");
  const [qty, setQty] = useState(1);
  const [candleData, setCandleData] = useState([]);

  const chartRef = useRef(null);
  const chartObj = useRef(null);

  /* ===========================
     FETCH DASHBOARD DATA
  ============================ */
  useEffect(() => {
    if (!token) return navigate("/login");

    async function load() {
      try {
        /* System state */
        const sysR = await fetch(`${API}/api/system`).then((r) => r.json());
        setSys(sysR);

        /* Portfolio */
        const pf = await fetch(`${API}/api/portfolio`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then((r) => r.json());

        setData({
          virtual_cash: Number(pf.virtual_cash || 0),
          positions: pf.positions || [],
          status: pf.status || "PENDING",
        });

        /* Market prices */
        const m = await fetch(`${API}/api/prices`).then((r) => r.json());

        // Track previous price
        setPreviousMarket((prev) => {
          const map = {};
          m.forEach((x) => {
            map[x.symbol] = prev[x.symbol] || Number(x.current_price);
          });
          return map;
        });

        // Price history for sparkline
        setMarketHistory((prev) => {
          const history = { ...prev };
          m.forEach((x) => {
            const price = Number(x.current_price);
            if (!history[x.symbol]) history[x.symbol] = [];
            history[x.symbol].push(price);
            if (history[x.symbol].length > 20) history[x.symbol].shift();
          });
          return history;
        });

        setMarket(m);

        /* ===========================
           Trade History (New)
        ============================ */
        const th = await fetch(`${API}/api/portfolio-history`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then((r) => r.json());
        setTradeHistory(th || []);
      } catch (err) {
        setPopup("Failed to load dashboard");
      }
    }

    load();
    const id = setInterval(load, 4000);
    return () => clearInterval(id);
  }, [token]);

  /* ===========================
     TRADE BUY/SELL
  ============================ */
  async function trade(kind, sym, quantity) {
    try {
      const r = await fetch(`${API}/api/trade/${kind}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          symbol: sym,
          quantity: Number(quantity),
        }),
      });

      const j = await r.json();
      if (!r.ok) return setPopup(j.error || "Trade failed");
    } catch (err) {
      setPopup("Trade failed");
    }
  }

  /* ===========================
     LOAD CANDLE DATA
  ============================ */
  function loadCandles(sym) {
    fetch(`${API}/api/candles/${sym}`)
      .then((r) => r.json())
      .then((res) => setCandleData(res));
  }

  /* ===========================
     RENDER CANDLE CHART
  ============================ */
  useEffect(() => {
    if (!chartRef.current || candleData.length === 0) return;

    if (chartObj.current) chartObj.current.remove();

    const chart = createChart(chartRef.current, {
      width: chartRef.current.clientWidth,
      height: 320,
      layout: { background: { color: "#0f1114" }, textColor: "#d1d5db" },
    });

    const series = chart.addSeries({
      type: "candlestick",
      upColor: "#22c55e",
      downColor: "#ef4444",
    });

    series.setData(
      candleData.map((d) => ({
        time: d.time,
        open: Number(d.open),
        high: Number(d.high),
        low: Number(d.low),
        close: Number(d.close),
      }))
    );

    chartObj.current = chart;
  }, [candleData]);

  /* ===========================
     UI RENDER
  ============================ */
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid gap-6 p-5 text-white bg-gray-950 min-h-screen"
    >
      {/* POPUP */}
      {popup && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-5 rounded-lg border border-gray-700 w-72 text-center">
            <div className="mb-3">{popup}</div>
            <button
              onClick={() => setPopup("")}
              className="px-4 py-2 bg-red-600 rounded w-full"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* STATUS BADGES */}
      <div className="flex gap-3">
        <div className={`px-3 py-1 rounded-full text-xs ${sys.trading_enabled ? "bg-green-600/20" : "bg-yellow-600/20"}`}>
          {sys.trading_enabled ? "Trading Open" : "Trading Paused"}
        </div>
        <div className={`px-3 py-1 rounded-full text-xs ${data.status === "APPROVED" ? "bg-green-600/20" : "bg-orange-600/20"}`}>
          {data.status}
        </div>
      </div>

      {/* CASH */}
      <Card>
        <div className="text-2xl font-bold">
          Virtual Cash: ${Number(data.virtual_cash).toFixed(2)}
        </div>
      </Card>

      {/* TRADE FORM */}
      {role !== "ADMIN" && (
        <Card>
          <div className="font-semibold mb-2">Trade</div>

          <div className="flex gap-3 flex-wrap items-center">
            <input
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              className="px-3 py-2 bg-gray-800 border border-gray-700 rounded"
            />

            <input
              type="number"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="px-3 py-2 bg-gray-800 border border-gray-700 rounded w-24"
              min="1"
            />

            <button
              disabled={!sys.trading_enabled}
              onClick={() => trade("buy", symbol, qty)}
              className="px-4 py-2 bg-green-600 rounded"
            >
              Buy
            </button>

            <button
              disabled={!sys.trading_enabled}
              onClick={() => trade("sell", symbol, qty)}
              className="px-4 py-2 bg-red-600 rounded"
            >
              Sell
            </button>
          </div>
        </Card>
      )}

      {/* ===========================
         POSITION TABLE
      ============================ */}
      {data.positions.length > 0 && (
        <Card>
          <div className="font-semibold mb-3">Your Positions</div>

          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400">
                <th className="p-2 text-left">Symbol</th>
                <th className="p-2 text-left">Qty</th>
                <th className="p-2 text-left">Avg Buy</th>
                <th className="p-2 text-left">Current</th>
                <th className="p-2 text-left">P/L</th>
                <th className="p-2 text-right">Sell</th>
              </tr>
            </thead>

            <tbody>
              {data.positions.map((p) => {
                const avg = Number(p.average_price || 0);
                const curr = Number(p.current_price || 0);

                const cost = avg * Number(p.quantity);
                const mkt = curr * Number(p.quantity);
                const diff = mkt - cost;

                const rising = diff >= 0;

                return (
                  <tr key={p.symbol} className="border-t border-gray-800">
                    <td className="p-2">{p.symbol}</td>
                    <td className="p-2">{p.quantity}</td>
                    <td className="p-2">${avg.toFixed(2)}</td>
                    <td className="p-2">${curr.toFixed(2)}</td>

                    <td className={`p-2 ${rising ? "text-green-400" : "text-red-400"}`}>
                      {rising ? "▲" : "▼"} {diff.toFixed(2)}
                    </td>

                    <td className="p-2 text-right">
                      <button
                        onClick={() => {
                          const q = prompt(`Sell how many ${p.symbol}? (Max ${p.quantity})`);
                          if (q) trade("sell", p.symbol, Number(q));
                        }}
                        className="px-3 py-1 bg-red-600 rounded hover:bg-red-500"
                      >
                        Sell
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      {/* ===========================
         MARKET TABLE (Trend Line)
      ============================ */}
      <Card>
        <div className="font-semibold mb-2">Market</div>

        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400">
              <th className="p-2 text-left">Symbol</th>
              <th className="p-2 text-left">Price</th>
              <th className="p-2 text-left">Trend</th>
              <th className="p-2 text-left">24s Movement</th>
              <th className="p-2 text-right">Actions</th>
            </tr>
          </thead>

          <tbody>
            {market.map((m) => {
              const curr = Number(m.current_price || 0);
              const prev = Number(previousMarket[m.symbol] || curr);
              const diff = curr - prev;

              const percent = prev ? ((diff / prev) * 100).toFixed(2) : "0.00";
              const rising = diff >= 0;

              const history = marketHistory[m.symbol] || [];

              return (
                <tr key={m.symbol} className="border-t border-gray-800">
                  <td className="p-2">{m.symbol}</td>
                  <td className="p-2">${curr.toFixed(2)}</td>

                  <td className={`p-2 font-bold ${rising ? "text-green-400" : "text-red-400"}`}>
                    {rising ? "▲" : "▼"} {percent}%
                  </td>

                  <td className="p-2">
                    <MiniTrend points={history} rising={rising} />
                  </td>

                  <td className="p-2 text-right">
                    {role !== "ADMIN" && (
                      <>
                        <button
                          onClick={() => {
                            const q = prompt(`Buy how many ${m.symbol}?`);
                            if (q) trade("buy", m.symbol, Number(q));
                          }}
                          className="px-3 py-1 bg-green-600 rounded"
                        >
                          Buy
                        </button>

                        <button
                          onClick={() => {
                            const q = prompt(`Sell how many ${m.symbol}?`);
                            if (q) trade("sell", m.symbol, Number(q));
                          }}
                          className="px-3 py-1 bg-red-600 rounded ml-2"
                        >
                          Sell
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {/* ===========================
         TRADE HISTORY (New)
      ============================ */}
      <Card>
        <div className="font-semibold mb-2">Recent Trade History</div>

        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400">
              <th className="p-2 text-left">Symbol</th>
              <th className="p-2 text-left">Type</th>
              <th className="p-2 text-left">Qty</th>
              <th className="p-2 text-left">Price</th>
              <th className="p-2 text-left">Time</th>
            </tr>
          </thead>

          <tbody>
            {tradeHistory.length > 0 ? (
              tradeHistory.map((t) => (
                <tr key={t.id} className="border-t border-gray-800">
                  <td className="p-2">{t.symbol}</td>

                  <td
                    className={`p-2 font-bold ${
                      t.trade_type === "BUY" ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {t.trade_type}
                  </td>

                  <td className="p-2">{t.quantity}</td>
                  <td className="p-2">${Number(t.price).toFixed(2)}</td>

                  <td className="p-2">
                    {new Date(t.timestamp).toLocaleTimeString()}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="p-2 text-gray-500 text-center" colSpan={5}>
                  No trades yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {/* ===========================
         CANDLE CHART
      ============================ */}
      {candleData.length > 0 && (
        <Card>
          <div className="font-semibold mb-2">Candlestick Chart — {symbol}</div>
          <div ref={chartRef} className="w-full h-80"></div>
        </Card>
      )}
    </motion.div>
  );
}
