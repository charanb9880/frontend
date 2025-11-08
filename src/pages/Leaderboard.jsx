import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_API_URL;

export default function Leaderboard() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  const [rows, setRows] = useState([]);
  const [lastValues, setLastValues] = useState({});
  const tableRef = useRef(null);

  useEffect(() => {
    if (role !== "ADMIN") {
      navigate("/");
      return;
    }

    function load() {
      fetch(`${API}/api/admin/leaderboard`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then((data) => {
          setRows((prev) => {
            const newLast = {};
            data.forEach((u) => {
              const prevVal = prev.find((p) => p.id === u.id)?.total_value || 0;
              const diff = Number(u.total_value) - Number(prevVal);

              newLast[u.id] = diff;
            });
            setLastValues(newLast);
            return data;
          });
        })
        .catch(console.error);
    }

    load();
    const id = setInterval(load, 4000);
    return () => clearInterval(id);
  }, [token, role, navigate]);

  const getDisplayName = (user) => {
    if (user.name && user.name.trim() !== "") return user.name;
    return user.email.split("@")[0];
  };

  const getRankBadge = (i) => {
    if (i === 0)
      return <span className="text-yellow-300 font-bold">🥇</span>;
    if (i === 1)
      return <span className="text-gray-300 font-bold">🥈</span>;
    if (i === 2)
      return <span className="text-orange-400 font-bold">🥉</span>;
    return i + 1;
  };

  return (
    <div className="text-white p-6 bg-gray-950 min-h-screen">
      <h2 className="text-3xl font-bold mb-6 text-center tracking-wide">
        📊 Live Leaderboard
      </h2>

      <div
        ref={tableRef}
        className="p-4 rounded-xl bg-gray-900/60 border border-gray-800 shadow-xl backdrop-blur-xl"
      >
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400 border-b border-gray-800">
              <th className="text-left pb-2">Rank</th>
              <th className="text-left pb-2">Name</th>
              <th className="text-right pb-2">Total Value</th>
              <th className="text-right pb-2">Profit / Loss</th>
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="text-center p-4 text-gray-500" colSpan="4">
                  No players yet
                </td>
              </tr>
            ) : (
              rows.map((p, i) => {
                const diff = lastValues[p.id] || 0;
                const animateClass =
                  diff > 0
                    ? "animate-[pulse_0.8s_ease-in-out] text-green-400"
                    : diff < 0
                    ? "animate-[pulse_0.8s_ease-in-out] text-red-400"
                    : "text-gray-200";

                return (
                  <tr key={p.id} className="border-t border-gray-800">
                    <td className="py-3 text-lg">{getRankBadge(i)}</td>

                    <td className="py-3 capitalize">{getDisplayName(p)}</td>

                    <td
                      className={`py-3 text-right transition-all duration-500 ${animateClass}`}
                    >
                      ${Number(p.total_value).toFixed(2)}
                    </td>

                    <td
                      className={`py-3 text-right font-bold ${
                        Number(p.profit) >= 0
                          ? "text-green-400"
                          : "text-red-400"
                      }`}
                    >
                      {Number(p.profit) >= 0 ? "▲ " : "▼ "}$
                      {Number(p.profit).toFixed(2)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
