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

export default function Dashboard() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");
  const userName = localStorage.getItem("name");

  const [data, setData] = useState({
    virtual_cash: 0,
    positions: [],
    status: "PENDING",
  });

  const [sys, setSys] = useState({ trading_enabled: false });
  const [market, setMarket] = useState([]);
  const [previousMarket, setPreviousMarket] = useState({});
  const [popup, setPopup] = useState("");
  const [symbol, setSymbol] = useState("AAPL");
  const [qty, setQty] = useState(1);
  const [candleData, setCandleData] = useState([]);

  const chartRef = useRef(null);
  const chartObj = useRef(null);

  function pl(p) {
    const cost = Number(p.average_price) * Number(p.quantity);
    const mkt = Number(p.current_price) * Number(p.quantity);
    const diff = mkt - cost;
    return { cost, mkt, diff };
  }

  // Load data every 4 sec
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

        // Save previous prices for trend calculation
        setPreviousMarket((prev) => {
          const newMap = {};
          if (Array.isArray(m)) {
            m.forEach((x) => {
              newMap[x.symbol] = prev[x.symbol] || x.current_price;
            });
          }
          return newMap;
        });

        setMarket(Array.isArray(m) ? m : []);
      } catch (e) {
        setPopup(e.message);
      }
    }

    load();
    const id = setInterval(load, 4000);
    return () => clearInterval(id);
  }, [token, navigate]);

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

      const pf = await fetch(`${API}/api/portfolio`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => r.json());
      setData(pf);
    } catch (e) {
      setPopup(e.message);
    }
  }

  function loadCandles(sym) {
    fetch(`${API}/api/candles/${sym}`)
      .then((r) => r.json())
      .then((res) => setCandleData(Array.isArray(res) ? res : []));
  }

  // Chart render
  useEffect(() => {
    if (!chartRef.current || candleData.length === 0) return;

    if (chartObj.current) chartObj.current.remove();

    const chart = createChart(chartRef.current, {
      width: chartRef.current.clientWidth,
      height: 320,
      layout: {
        background: { color: "#0f1114" },
        textColor: "#d1d5db",
      },
      grid: {
        vertLines: { color: "#1f2937" },
        horzLines: { color: "#1f2937" },
      },
    });

    const candleSeries = chart.addSeries({
      type: "candlestick",
      upColor: "#16a34a",
      downColor: "#dc2626",
      wickUpColor: "#16a34a",
      wickDownColor: "#dc2626",
      borderUpColor: "#16a34a",
      borderDownColor: "#dc2626",
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

  const priceObj = market.find((m) => m.symbol === symbol);
  const price = Number(priceObj?.current_price ?? 0);
  const totalCost = price * qty;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid gap-5 p-5 text-white bg-gray-950 min-h-screen"
    >
      {/* Popup */}
      {popup && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-600 w-72 text-center">
            <div className="text-white">{popup}</div>
            <button
              className="mt-3 w-full bg-red-600 py-2 rounded"
              onClick={() => setPopup("")}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Status Badges */}
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

      {/* Cash */}
      <Card>
        <div className="text-2xl font-bold">
          Virtual Cash: ${Number(data.virtual_cash).toFixed(2)}
        </div>
      </Card>

      {/* Trade Panel */}
      {role !== "ADMIN" && (
        <Card>
          <div className="font-semibold mb-2">Trade</div>
          <div className="flex flex-wrap gap-3 items-center">
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
              className="px-4 py-2 bg-green-600 rounded hover:bg-green-500 disabled:opacity-50"
            >
              Buy
            </button>

            <button
              disabled={!sys.trading_enabled}
              onClick={() => trade("sell", symbol, qty)}
              className="px-4 py-2 bg-red-600 rounded hover:bg-red-500 disabled:opacity-50"
            >
              Sell
            </button>
          </div>

          {price > 0 && (
            <div className="text-sm text-gray-300 mt-1">
              Price: ${price.toFixed(2)} | Total: ${totalCost.toFixed(2)}
            </div>
          )}
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
                    <td
                      className={`text-right font-bold ${
                        profit ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {profit ? "▲" : "▼"} ${diff.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      {/* ============================
          🔥 UPDATED MARKET SECTION
          WITH LIVE TREND (▲ ▼ + %)
      ============================ */}
      <Card>
        <div className="font-semibold mb-2">Market</div>

        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400">
              <th className="p-2 text-left">Symbol</th>
              <th className="p-2 text-left">Price</th>
              <th className="p-2 text-left">Trend</th>
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

              return (
                <tr key={m.symbol} className="border-t border-gray-800">
                  <td className="p-2">{m.symbol}</td>

                  <td className="p-2">
                    ${current.toFixed(2)}
                  </td>

                  {/* 📈 Trend */}
                  <td
                    className={`p-2 font-bold ${
                      rising ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {rising ? "▲" : "▼"} {percent}%
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

                    <button
                      onClick={() => {
                        setSymbol(m.symbol);
                        loadCandles(m.symbol);
                      }}
                      className="px-3 py-1 bg-blue-600 rounded"
                    >
                      Chart
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {/* Chart */}
      {candleData.length > 0 && (
        <Card>
          <div className="font-semibold mb-2">Candlestick Chart — {symbol}</div>
          <div ref={chartRef} className="w-full h-80"></div>
        </Card>
      )}
    </motion.div>
  );
}
