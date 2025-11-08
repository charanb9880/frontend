import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

const API = import.meta.env.VITE_API_URL;

export default function AdminPanel() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  const [players, setPlayers] = useState([]);
  const [sys, setSys] = useState({ trading_enabled: false });
  const [cash, setCash] = useState(50000);
  const [leaderboard, setLeaderboard] = useState([]);
  const [recentTrades, setRecentTrades] = useState([]);

  // Auto load every 4s
  useEffect(() => {
    if (role !== "ADMIN") {
      navigate("/");
      return;
    }
    load();
    const interval = setInterval(load, 4000);
    return () => clearInterval(interval);
  }, []);

  async function load() {
    const h = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    try {
      const s = await fetch(`${API}/api/system`).then((r) => r.json());
      setSys(s);

      const p = await fetch(`${API}/api/admin/players`, { headers: h }).then((r) =>
        r.json()
      );
      setPlayers(p);

      const lb = await fetch(`${API}/api/admin/leaderboard`, {
        headers: h,
      }).then((r) => r.json());
      setLeaderboard(lb);

      const t = await fetch(`${API}/api/admin/recent-trades`, {
        headers: h,
      }).then((r) => r.json());
      setRecentTrades(t);
    } catch (err) {
      console.log("Admin load failed:", err);
    }
  }

  async function approve(id) {
    const h = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
    await fetch(`${API}/api/admin/approve`, {
      method: "POST",
      headers: h,
      body: JSON.stringify({ user_id: id, virtual_cash: Number(cash) }),
    });
    load();
  }

  async function block(id) {
    const h = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
    await fetch(`${API}/api/admin/block`, {
      method: "POST",
      headers: h,
      body: JSON.stringify({ user_id: id }),
    });
    load();
  }

  async function toggle() {
    const h = { Authorization: `Bearer ${token}` };
    const url = sys.trading_enabled
      ? "/api/admin/trading/stop"
      : "/api/admin/trading/start";
    await fetch(`${API}${url}`, { method: "POST", headers: h });
    load();
  }

  function displayName(p) {
    if (p.name && p.name.trim() !== "") return p.name;
    return p.email.split("@")[0];
  }

  return (
    <div className="grid gap-6 p-4 text-white max-w-6xl mx-auto min-h-screen bg-gray-950">

      {/* ✅ Trading Control */}
      <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold text-2xl">Trading Control</div>
            <div className="text-sm text-gray-300 mt-1">
              Status:{" "}
              {sys.trading_enabled ? (
                <span className="text-green-400 font-bold">OPEN ✅</span>
              ) : (
                <span className="text-yellow-400 font-bold">PAUSED ⏸</span>
              )}
            </div>
          </div>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={toggle}
            className={`px-5 py-2 rounded text-white font-semibold transition ${
              sys.trading_enabled
                ? "bg-rose-600 hover:bg-rose-500"
                : "bg-emerald-600 hover:bg-emerald-500"
            }`}
          >
            {sys.trading_enabled ? "Stop Trading" : "Start Trading"}
          </motion.button>
        </div>
      </div>

      {/* ✅ Players Table */}
      <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800 shadow-lg">
        <div className="font-semibold mb-3 text-xl">Players</div>

        <div className="flex gap-2 items-center mb-3">
          <span className="text-sm text-gray-300">Assign Cash on Approve:</span>
          <input
            className="px-2 py-1 w-32 rounded bg-gray-800 border border-gray-700"
            type="number"
            value={cash}
            onChange={(e) => setCash(e.target.value)}
          />
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400">
              <th className="text-left pb-2">Email</th>
              <th className="text-left pb-2">Status</th>
              <th className="text-right pb-2">Cash</th>
              <th className="text-right pb-2">Action</th>
            </tr>
          </thead>

          <tbody>
            {players.map((p) => (
              <motion.tr
                key={p.id}
                layout
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="border-t border-gray-800"
              >
                <td className="py-2">{p.email}</td>
                <td>{p.status}</td>
                <td className="text-right">${Number(p.virtual_cash).toFixed(2)}</td>
                <td className="text-right">
                  {p.status !== "APPROVED" ? (
                    <button
                      onClick={() => approve(p.id)}
                      className="px-3 py-1 bg-emerald-600 rounded hover:bg-emerald-500"
                    >
                      Approve
                    </button>
                  ) : (
                    <button
                      onClick={() => block(p.id)}
                      className="px-3 py-1 bg-rose-600 rounded hover:bg-rose-500"
                    >
                      Block
                    </button>
                  )}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ✅ Live Leaderboard */}
      <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800 shadow-lg">
        <div className="font-semibold mb-3 text-xl">Live Leaderboard</div>

        <AnimatePresence>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400">
                <th className="text-left pb-2">User</th>
                <th className="text-right pb-2">Total Value</th>
                <th className="text-right pb-2">P/L</th>
              </tr>
            </thead>

            <tbody>
              {leaderboard.map((p) => {
                const total = Number(p.total_value) || 0;
                const prof = Number(p.profit) || 0;
                const green = prof >= 0;

                return (
                  <motion.tr
                    key={p.id}
                    layout
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="border-t border-gray-800"
                  >
                    <td className="py-2">{displayName(p)}</td>
                    <td className="text-right">${total.toFixed(2)}</td>
                    <td className={`text-right font-bold ${green ? "text-green-400" : "text-red-400"}`}>
                      {green ? "▲" : "▼"} ${prof.toFixed(2)}
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </AnimatePresence>
      </div>

      {/* ✅ Recent Trades */}
      <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800 shadow-lg">
        <div className="font-semibold mb-3 text-xl">Recent Trades</div>

        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400">
              <th className="text-left pb-2">User</th>
              <th className="text-left pb-2">Symbol</th>
              <th className="text-left pb-2">Type</th>
              <th className="text-right pb-2">Qty</th>
              <th className="text-right pb-2">Price</th>
              <th className="text-right pb-2">Time</th>
            </tr>
          </thead>

          <tbody>
            {recentTrades.map((t) => (
              <motion.tr
                key={t.id}
                layout
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="border-t border-gray-800"
              >
                <td className="py-2">{t.name || t.email.split("@")[0]}</td>
                <td>{t.symbol}</td>
                <td className={t.trade_type === "BUY" ? "text-green-400" : "text-red-400"}>
                  {t.trade_type}
                </td>
                <td className="text-right">{t.quantity}</td>
                <td className="text-right">${Number(t.price).toFixed(2)}</td>
                <td className="text-right">
                  {new Date(t.time).toLocaleTimeString()}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}
