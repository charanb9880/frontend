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

  // EDIT CASH MODAL
  const [editUser, setEditUser] = useState(null);
  const [editAmount, setEditAmount] = useState("");

  // ASSIGN CASH MODAL
  const [assignUser, setAssignUser] = useState(null);
  const [assignAmount, setAssignAmount] = useState("");

  // BULK APPROVE modal
  const [showBulkApprove, setShowBulkApprove] = useState(false);
  const [bulkAmount, setBulkAmount] = useState("");

  // ✅ UNIVERSAL TIME FORMATTER
  function formatTradeTime(time) {
    if (!time) return "—";

    let t = time;

    // If timestamp is numeric (unix seconds or ms)
    if (!isNaN(t)) {
      t = Number(t);

      // seconds → milliseconds
      if (t.toString().length === 10) {
        t = t * 1000;
      }

      const d = new Date(t);
      return isNaN(d) ? "—" : d.toLocaleTimeString();
    }

    // SQL style: "YYYY-MM-DD HH:MM:SS"
    if (typeof t === "string" && t.includes(" ") && !t.includes("T")) {
      t = t.replace(" ", "T");
    }

    const d = new Date(t);
    return isNaN(d) ? "—" : d.toLocaleTimeString();
  }

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
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    try {
      const s = await fetch(`${API}/api/system`).then((r) => r.json());
      setSys(s);

      const p = await fetch(`${API}/api/admin/players`, { headers }).then((r) =>
        r.json()
      );
      setPlayers(p);

      const lb = await fetch(`${API}/api/admin/leaderboard`, {
        headers,
      }).then((r) => r.json());
      setLeaderboard(lb);

      const rt = await fetch(`${API}/api/admin/recent-trades`, {
        headers,
      }).then((r) => r.json());
      setRecentTrades(rt);
    } catch (err) {
      console.error("Admin load failed:", err);
    }
  }

  // Approve single user
  async function approve(id) {
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    await fetch(`${API}/api/admin/approve`, {
      method: "POST",
      headers,
      body: JSON.stringify({ user_id: id, virtual_cash: Number(cash) }),
    });

    load();
  }

  // Block user
  async function block(id) {
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    await fetch(`${API}/api/admin/block`, {
      method: "POST",
      headers,
      body: JSON.stringify({ user_id: id }),
    });

    load();
  }

  // Trading toggle
  async function toggle() {
    const headers = { Authorization: `Bearer ${token}` };
    const url = sys.trading_enabled
      ? "/api/admin/trading/stop"
      : "/api/admin/trading/start";

    await fetch(`${API}${url}`, { method: "POST", headers });
    load();
  }

  // Save edited cash
  async function saveCash() {
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    await fetch(`${API}/api/admin/set-virtual-cash`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        user_id: editUser.id,
        virtual_cash: Number(editAmount),
      }),
    });

    setEditUser(null);
    load();
  }

  // Assign cash to user
  async function assignCash() {
    if (!assignUser) return;
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    await fetch(`${API}/api/admin/assign-cash/${assignUser.id}`, {
      method: "POST",
      headers,
      body: JSON.stringify({ amount: Number(assignAmount) }),
    });

    setAssignUser(null);
    setAssignAmount("");
    load();
  }

  // Bulk approve
  async function bulkApprove() {
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    await fetch(`${API}/api/admin/approve-all`, {
      method: "POST",
      headers,
      body: JSON.stringify({ amount: Number(bulkAmount) }),
    });

    setShowBulkApprove(false);
    setBulkAmount("");
    load();
  }

  function displayName(p) {
    if (p.name && p.name.trim() !== "") return p.name;
    return p.email.split("@")[0];
  }

  return (
    <div className="grid gap-6 p-4 text-white max-w-6xl mx-auto min-h-screen bg-gray-950">

      {/* ---- Modals (Edit, Assign, Bulk) remain same ---- */}

      <AnimatePresence>
        {editUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.7, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.7, opacity: 0 }}
              className="bg-gray-900 p-6 rounded-2xl border border-gray-700 w-80 shadow-2xl"
            >
              <h2 className="text-xl font-bold mb-3">Edit Cash</h2>
              <p className="text-gray-300 mb-2">{editUser.email}</p>

              <input
                type="number"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-700 mb-4"
              />

              <div className="flex justify-between">
                <button
                  onClick={() => setEditUser(null)}
                  className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600"
                >
                  Cancel
                </button>

                <button
                  onClick={saveCash}
                  className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500"
                >
                  Save
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ASSIGN CASH */}
      <AnimatePresence>
        {assignUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.7, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.7, opacity: 0 }}
              className="bg-gray-900 p-6 rounded-2xl border border-gray-700 w-80 shadow-2xl"
            >
              <h2 className="text-xl font-bold mb-3">Assign Cash</h2>
              <p className="text-gray-300 mb-2">{assignUser.email}</p>

              <input
                type="number"
                value={assignAmount}
                onChange={(e) => setAssignAmount(e.target.value)}
                className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-700 mb-4"
                placeholder="Enter amount (e.g., 50000)"
              />

              <div className="flex justify-between">
                <button
                  onClick={() => {
                    setAssignUser(null);
                    setAssignAmount("");
                  }}
                  className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600"
                >
                  Cancel
                </button>

                <button
                  onClick={assignCash}
                  className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-500"
                >
                  Assign
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BULK APPROVE */}
      <AnimatePresence>
        {showBulkApprove && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-gray-900 p-6 rounded-2xl border border-gray-700 w-80 shadow-2xl"
            >
              <h2 className="text-xl font-bold mb-3">Approve All & Assign Funds</h2>

              <input
                type="number"
                value={bulkAmount}
                onChange={(e) => setBulkAmount(e.target.value)}
                className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-700 mb-4"
                placeholder="Enter amount for all pending users"
              />

              <div className="flex justify-between">
                <button
                  onClick={() => {
                    setShowBulkApprove(false);
                    setBulkAmount("");
                  }}
                  className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600"
                >
                  Cancel
                </button>

                <button
                  onClick={bulkApprove}
                  className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500"
                >
                  Approve All
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TRADING CONTROL */}
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

      {/* PLAYERS TABLE */}
      <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800 shadow-lg">

        <div className="flex justify-between mb-3">
          <div className="font-semibold text-xl">Players</div>

          <button
            onClick={() => setShowBulkApprove(true)}
            className="px-4 py-2 bg-blue-700 rounded hover:bg-blue-600"
          >
            Approve All + Assign Funds
          </button>
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

                <td className="py-2">
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => {
                        setAssignUser(p);
                        setAssignAmount("");
                      }}
                      className="px-3 py-1 bg-purple-600 rounded hover:bg-purple-500"
                    >
                      Assign Cash
                    </button>

                    <button
                      onClick={() => {
                        setEditUser(p);
                        setEditAmount(p.virtual_cash);
                      }}
                      className="px-3 py-1 bg-blue-600 rounded hover:bg-blue-500"
                    >
                      Edit Cash 💰
                    </button>

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
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* LEADERBOARD */}
      <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800 shadow-lg">
        <div className="font-semibold mb-3 text-xl">Live Leaderboard</div>

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
                  <td
                    className={`text-right font-bold ${
                      green ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {green ? "▲" : "▼"} ${prof.toFixed(2)}
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* RECENT TRADES — FIXED */}
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
                <td
                  className={
                    t.trade_type === "BUY" ? "text-green-400" : "text-red-400"
                  }
                >
                  {t.trade_type}
                </td>
                <td className="text-right">{t.quantity}</td>
                <td className="text-right">
                  ${Number(t.price).toFixed(2)}
                </td>

                {/* ✔ FIXED UNIVERSAL TIME DISPLAY */}
                <td className="text-right">
                  {formatTradeTime(t.time)}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
