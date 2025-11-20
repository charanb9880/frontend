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

function MiniTrend({ points, rising }) {
  if (!points || points.length < 2) return <div className="h-6"></div>;

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
        strokeLinecap="round"
        points={normalized.join(" ")}
      />
    </svg>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  const [data, setData] = useState({
    virtual_cash: 0,
    positions: [],
    status: "PENDING",
  });

  const [sys, setSys] = useState({ trading_enabled: false });
  const [market, setMarket] = useState([]);
  const [previousMarket, setPreviousMarket] = useState({});
  const [marketHistory, setMarketHistory] = useState({});
  const [tradeHistory, setTradeHistory] = useState([]);
  const [popup, setPopup] = useState("");

  const [symbol, setSymbol] = useState("AAPL");
  const [qty, setQty] = useState(1);
  const [candleData, setCandleData] = useState([]);

  const chartRef = useRef(null);
  const chartObj = useRef(null);

  /* ======================
      LOAD DATA
  ======================= */
  useEffect(() => {
    if (!token) return navigate("/login");

    async function load() {
      try {
        const sysR = await fetch(`${API}/api/system`).then((r) => r.json());
        setSys(sysR);

        const pf = await fetch(`${API}/api/portfolio`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then((r) => r.json());
        setData(pf);

        const m = await fetch(`${API}/api/prices`).then((r) => r.json());

        setPreviousMarket((prev) => {
          const map = {};
          m.forEach((x) => {
            map[x.symbol] = prev[x.symbol] || x.current_price;
          });
          return map;
        });

        setMarketHistory((prev) => {
          const h = { ...prev };
          m.forEach((x) => {
            if (!h[x.symbol]) h[x.symbol] = [];
            h[x.symbol].push(Number(x.current_price));
            if (h[x.symbol].length > 20) h[x.symbol].shift();
          });
          return h;
        });

        setMarket(m);

        // FIXED: User trade history endpoint
        const trades = await fetch(`${API}/api/portfolio-history`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then((r) => r.json());
        setTradeHistory(trades);
      } catch (e) {
        setPopup(e.message);
      }
    }

    load();
    const id = setInterval(load, 4000);
    return () => clearInterval(id);
  }, [token, navigate]);

  /* ======================
      REFRESH AFTER TRADE
  ======================= */
  async function refreshPortfolioAndTrades() {
    const pf = await fetch(`${API}/api/portfolio`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((r) => r.json());
    setData(pf);

    const trades = await fetch(`${API}/api/portfolio-history`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((r) => r.json());
    setTradeHistory(trades);
  }

  /* ======================
      TRADE
  ======================= */
  async function trade(kind, sym, quantity) {
    if (role === "ADMIN") return alert("Admins cannot trade!");

    try {
      const r = await fetch(`${API}/api/trade/${kind}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ symbol: sym, quantity: Number(quantity) }),
      });

      const j = await r.json();
      if (!r.ok) return setPopup(j.error || "Trade failed");

      await refreshPortfolioAndTrades();
    } catch (e) {
      setPopup(e.message);
    }
  }

  /* ======================
      CANDLES
  ======================= */
  function loadCandles(sym) {
    fetch(`${API}/api/candles/${sym}`)
      .then((r) => r.json())
      .then((res) => setCandleData(res));
  }

  useEffect(() => {
    loadCandles(symbol);
  }, [symbol]);

  useEffect(() => {
    if (!chartRef.current || candleData.length === 0) return;

    if (chartObj.current) chartObj.current.remove();

    const chart = createChart(chartRef.current, {
      width: chartRef.current.clientWidth,
      height: 320,
      layout: { background: { color: "#0f1114" }, textColor: "#d1d5db" },
      grid: {
        vertLines: { color: "#1f2937" },
        horzLines: { color: "#1f2937" },
      },
    });

    // FIXED: Correct v4 API
    const candleSeries = chart.addCandlestickSeries({
      upColor: "#16a34a",
      downColor: "#dc2626",
      borderVisible: false,
      wickUpColor: "#16a34a",
      wickDownColor: "#dc2626",
    });

    candleSeries.setData(
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

  /* ======================
      UI
  ======================= */
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid gap-5 p-5 text-white bg-gray-950 min-h-screen"
    >
      {/* POPUP */}
      {popup && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-600 w-72 text-center">
            <div>{popup}</div>
            <button
              className="mt-3 w-full bg-red-600 py-2 rounded"
              onClick={() => setPopup("")}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* STATUS */}
      <div className="flex gap-3">
        <div
          className={`px-3 py-1 rounded-full text-xs ${
            sys.trading_enabled ? "bg-green-600/20" : "bg-yellow-600/20"
          }`}
        >
          {sys.trading_enabled ? "Trading Open" : "Trading Paused"}
        </div>

        <div
          className={`px-3 py-1 rounded-full text-xs ${
            data.status === "APPROVED" ? "bg-green-600/20" : "bg-orange-600/20"
          }`}
        >
          {data.status === "APPROVED" ? "Approved" : "Awaiting Approval"}
        </div>
      </div>

      {/* CASH */}
      <Card>
        <div className="text-2xl font-bold">
          Virtual Cash: ${Number(data.virtual_cash).toFixed(2)}
        </div>
      </Card>

      {/* TRADE */}
      {role !== "ADMIN" && (
        <Card>
          <div className="font-semibold mb-2">Trade</div>

          <div className="flex gap-3 items-center flex-wrap">
            <input
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              className="px-3 py-2 bg-gray-800 rounded border border-gray-700"
            />

            <input
              type="number"
              min="1"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="px-3 py-2 bg-gray-800 rounded border border-gray-700 w-24"
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

      {/* MARKET */}
      <Card>
        <div className="font-semibold mb-2">Market</div>

        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400">
              <th className="p-2 text-left">Symbol</th>
              <th className="p-2 text-left">Price</th>
              <th className="p-2 text-left">Trend</th>
              <th className="p-2 text-left">Growth</th>
              <th className="p-2 text-right">Actions</th>
            </tr>
          </thead>

          <tbody>
            {market.map((m) => {
              const current = Number(m.current_price);
              const prev = Number(previousMarket[m.symbol] || current);
              const diff = current - prev;
              const percent = prev > 0 ? ((diff / prev) * 100).toFixed(2) : 0;
              const rising = diff >= 0;
              const history = marketHistory[m.symbol] || [];

              return (
                <tr key={m.symbol} className="border-t border-gray-800">
                  <td
                    className="p-2 cursor-pointer hover:underline"
                    onClick={() => setSymbol(m.symbol)}
                  >
                    {m.symbol}
                  </td>

                  <td className="p-2">${current.toFixed(2)}</td>

                  <td
                    className={`p-2 font-bold ${
                      rising ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {rising ? "▲" : "▼"} {percent}%
                  </td>

                  <td className="p-2">
                    <MiniTrend points={history} rising={rising} />
                  </td>

                  <td className="p-2 text-right flex gap-2 justify-end">
                    {role !== "ADMIN" && (
                      <>
                        <button
                          onClick={() => {
                            const q = prompt(`Buy how many shares of ${m.symbol}?`);
                            if (q) trade("buy", m.symbol, q);
                          }}
                          className="px-3 py-1 bg-green-600 rounded"
                        >
                          Buy
                        </button>

                        <button
                          onClick={() => {
                            const q = prompt(`Sell how many shares of ${m.symbol}?`);
                            if (q) trade("sell", m.symbol, q);
                          }}
                          className="px-3 py-1 bg-red-600 rounded"
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
    USER HOLDINGS TABLE
=========================== */}
<Card>
  <div className="font-semibold mb-2">Your Holdings</div>

  <table className="w-full text-sm">
    <thead>
      <tr className="text-gray-400">
        <th className="p-2 text-left">Symbol</th>
        <th className="p-2 text-left">Qty</th>
        <th className="p-2 text-left">Avg Price</th>
        <th className="p-2 text-left">Current</th>
        <th className="p-2 text-left">P/L</th>
        <th className="p-2 text-right">Sell</th>
      </tr>
    </thead>

    <tbody>
      {data.positions.length > 0 ? (
        data.positions.map((p) => {
          const avg = Number(p.average_price);
          const curr = Number(p.current_price);
          const pl = ((curr - avg) / avg) * 100;

          return (
            <tr key={p.symbol} className="border-t border-gray-800">
              <td
                className="p-2 cursor-pointer hover:underline"
                onClick={() => setSymbol(p.symbol)}
              >
                {p.symbol}
              </td>

              <td className="p-2">{p.quantity}</td>

              <td className="p-2">${avg.toFixed(2)}</td>

              <td className="p-2">${curr.toFixed(2)}</td>

              <td
                className={`p-2 font-bold ${
                  pl >= 0 ? "text-green-400" : "text-red-400"
                }`}
              >
                {pl.toFixed(2)}%
              </td>

              <td className="p-2 text-right">
                <button
                  onClick={() => {
                    const q = prompt(
                      `Sell how many of ${p.symbol}? (You own ${p.quantity})`
                    );
                    if (q) trade("sell", p.symbol, q);
                  }}
                  className="px-3 py-1 bg-red-600 rounded"
                >
                  Sell
                </button>
              </td>
            </tr>
          );
        })
      ) : (
        <tr>
          <td className="p-2 text-center text-gray-500" colSpan={6}>
            No holdings yet
          </td>
        </tr>
      )}
    </tbody>
  </table>
</Card>


     
    </motion.div>
  );
}
