import React, { useEffect, useState } from "react";
const API = import.meta.env.VITE_API_URL;

export default function Landing() {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  const [sys, setSys] = useState({ trading_enabled: false });
  const [players, setPlayers] = useState([]);
  const [cashAssign, setCashAssign] = useState(100000);
  const [recentTrades, setRecentTrades] = useState([]);

  // NEW: Assign to individual
  const [assignUser, setAssignUser] = useState(null);
  const [assignAmount, setAssignAmount] = useState("");

  // NEW: Bulk approve modal
  const [bulkModal, setBulkModal] = useState(false);
  const [bulkAmount, setBulkAmount] = useState("");

  useEffect(() => {
    load();
    const id = setInterval(load, 4000);
    return () => clearInterval(id);
  }, []);

  async function load() {
    try {
      const sysData = await fetch(`${API}/api/system`).then((r) => r.json());
      setSys(sysData);

      if (!token || role !== "ADMIN") return;

      const h = { Authorization: `Bearer ${token}` };

      const p = await fetch(`${API}/api/admin/players`, { headers: h }).then(r => r.json());
      setPlayers(p);

      const t = await fetch(`${API}/api/admin/recent-trades`, { headers: h }).then(r => r.json());
      setRecentTrades(t);

    } catch (err) {
      console.error("Load error:", err);
    }
  }

  async function toggleTrading() {
    const h = { Authorization: `Bearer ${token}` };
    const url = sys.trading_enabled
      ? "/api/admin/trading/stop"
      : "/api/admin/trading/start";
    await fetch(`${API}${url}`, { method: "POST", headers: h });
    load();
  }

  async function approve(id) {
    const h = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
    await fetch(`${API}/api/admin/approve`, {
      method: "POST",
      headers: h,
      body: JSON.stringify({ user_id: id, virtual_cash: Number(cashAssign) }),
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

  async function removeUser(id) {
    if (!confirm("Remove user permanently?")) return;

    const h = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
    const res = await fetch(`${API}/api/admin/remove`, {
      method: "POST",
      headers: h,
      body: JSON.stringify({ user_id: id }),
    });

    const data = await res.json();
    if (data.ok) {
      alert("User removed");
      load();
    } else {
      alert(data.error || "Error removing user");
    }
  }

  // NEW: Assign cash to individual
  async function assignCashToUser() {
    if (!assignUser) return;

    const h = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    await fetch(`${API}/api/admin/assign-cash/${assignUser.id}`, {
      method: "POST",
      headers: h,
      body: JSON.stringify({ amount: Number(assignAmount) }),
    });

    setAssignUser(null);
    setAssignAmount("");
    load();
  }

  // NEW: Bulk approve all
  async function approveAll() {
    const h = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    await fetch(`${API}/api/admin/approve-all`, {
      method: "POST",
      headers: h,
      body: JSON.stringify({ amount: Number(bulkAmount) }),
    });

    setBulkModal(false);
    setBulkAmount("");
    load();
  }

  return (
    <div className="grid gap-6">

      {/* Non-admin landing UI */}
      {role !== "ADMIN" && (
        <div className="p-6 rounded-xl bg-gray-900/60 border border-gray-800">
          <h2 className="text-xl font-bold">Welcome to TradeRace</h2>
          <p className="text-sm text-gray-400 mt-1">Compete in virtual stock trading!</p>
          <span
            className={`px-3 py-1 text-xs mt-2 inline-block rounded-full ${
              sys.trading_enabled
                ? "bg-emerald-500/30 text-emerald-200"
                : "bg-yellow-500/30 text-yellow-200"
            }`}
          >
            {sys.trading_enabled ? "LIVE: Trading Open" : "Trading Paused"}
          </span>
        </div>
      )}

      {/* ADMIN DASHBOARD */}
      {role === "ADMIN" && (
        <div className="grid gap-6">

          {/* Trading Control */}
          <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800 flex justify-between items-center">
            <div>
              <div className="font-semibold text-lg">Trading Control</div>
              <div className="text-sm text-gray-400">
                Status:{" "}
                {sys.trading_enabled ? (
                  <span className="text-green-400 font-bold">OPEN</span>
                ) : (
                  <span className="text-yellow-400 font-bold">PAUSED</span>
                )}
              </div>
            </div>

            <button
              onClick={toggleTrading}
              className={`px-5 py-2 rounded text-white font-semibold ${
                sys.trading_enabled
                  ? "bg-rose-600 hover:bg-rose-500"
                  : "bg-emerald-600 hover:bg-emerald-500"
              }`}
            >
              {sys.trading_enabled ? "Stop Trading" : "Start Trading"}
            </button>
          </div>

          {/* Players Table */}
          <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800">

            <div className="flex justify-between mb-3">
              <div className="font-semibold text-lg">Players</div>

              {/* NEW: Bulk approve button */}
              <button
                onClick={() => setBulkModal(true)}
                className="px-4 py-2 bg-blue-700 rounded hover:bg-blue-600"
              >
                Approve All + Assign Funds
              </button>
            </div>



            <table className="w-full text-sm">
              <thead className="text-gray-400">
                <tr>
                  <th className="p-2 text-left">Email</th>
                  <th className="p-2 text-center">Status</th>
                  <th className="p-2 text-right">Cash</th>
                  <th className="p-2 text-right">Actions</th>
                </tr>
              </thead>

              <tbody>
                {players.length ? (
                  players.map((p) => (
                    <tr key={p.id} className="border-t border-gray-800">
                      <td className="p-2">{p.email}</td>
                      <td className="p-2 text-center">{p.status}</td>
                      <td className="p-2 text-right">${Number(p.virtual_cash).toFixed(2)}</td>

                      <td className="p-2">
                        <div className="flex gap-2 justify-end">

                          {/* NEW: Assign Cash */}
                          <button
                            onClick={() => {
                              setAssignUser(p);
                              setAssignAmount("");
                            }}
                            className="px-3 py-1 bg-purple-600 rounded hover:bg-purple-500"
                          >
                            Assign Cash
                          </button>

                          {/* Existing Approve / Block */}
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

                          {/* Remove */}
                          <button
                            onClick={() => removeUser(p.id)}
                            className="px-3 py-1 bg-gray-600 rounded hover:bg-gray-500"
                          >
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="p-2 text-center text-gray-500">
                      No players found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Recent Trades */}
          <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800">
            <div className="font-semibold text-lg mb-3">Recent Trades</div>

            <table className="w-full text-sm">
              <thead className="text-gray-400">
                <tr>
                  <th className="p-2 text-left">User</th>
                  <th className="p-2 text-left">Symbol</th>
                  <th className="p-2 text-left">Type</th>
                  <th className="p-2 text-right">Qty</th>
                  <th className="p-2 text-right">Price</th>
                  <th className="p-2 text-right">Time</th>
                </tr>
              </thead>

              <tbody>
                {recentTrades.length ? (
                  recentTrades.map((t) => (
                    <tr key={t.id} className="border-t border-gray-800">
                      <td className="p-2">{t.email}</td>
                      <td className="p-2">{t.symbol}</td>
                      <td className={`p-2 ${t.trade_type === "BUY" ? "text-green-400" : "text-red-400"}`}>
                        {t.trade_type}
                      </td>
                      <td className="p-2 text-right">{t.quantity}</td>
                      <td className="p-2 text-right">${Number(t.price).toFixed(2)}</td>
                      <td className="p-2 text-right">
                        {new Date(t.time).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="p-2 text-center text-gray-500">
                      No trades yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* MODALS */}

      {/* Assign Individual Cash Modal */}
      {assignUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-gray-900 p-6 rounded-xl w-80 border border-gray-700">
            <div className="text-lg font-bold mb-3">Assign Cash</div>
            <div className="text-gray-400 mb-2">{assignUser.email}</div>

            <input
              type="number"
              value={assignAmount}
              onChange={(e) => setAssignAmount(e.target.value)}
              placeholder="Enter amount"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded mb-4"
            />

            <div className="flex justify-between">
              <button
                onClick={() => setAssignUser(null)}
                className="px-4 py-2 bg-gray-700 rounded"
              >
                Cancel
              </button>

              <button
                onClick={assignCashToUser}
                className="px-4 py-2 bg-blue-600 rounded"
              >
                Assign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Approve Modal */}
      {bulkModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-gray-900 p-6 rounded-xl w-80 border border-gray-700">
            <div className="text-lg font-bold mb-3">Approve All Users</div>

            <input
              type="number"
              value={bulkAmount}
              onChange={(e) => setBulkAmount(e.target.value)}
              placeholder="Enter amount to assign to all"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded mb-4"
            />

            <div className="flex justify-between">
              <button
                onClick={() => setBulkModal(false)}
                className="px-4 py-2 bg-gray-700 rounded"
              >
                Cancel
              </button>

              <button
                onClick={approveAll}
                className="px-4 py-2 bg-green-600 rounded"
              >
                Approve All
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
