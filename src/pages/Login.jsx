import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Popup from "../components/Popup";

const API = import.meta.env.VITE_API_URL;

export default function Login() {
  const nav = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [popup, setPopup] = useState("");

  async function submit(e) {
    e.preventDefault();
    const r = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const j = await r.json();
    if (!r.ok) {
      setPopup(j.error || "Login failed");
      return;
    }

    localStorage.setItem("token", j.token);
    localStorage.setItem("role", j.role);
    localStorage.setItem("name", j.name || email.split("@")[0]);

    setPopup("Login successful ✅");
    setTimeout(() => nav("/"), 1200);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">

      {popup && (
        <Popup
          text={popup}
          color="green"
          onClose={() => setPopup("")}
        />
      )}

      <motion.div
        initial={{ y: -70, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-gray-900/60 p-6 w-96 rounded-xl border border-gray-800 shadow-xl"
      >
        <h2 className="text-xl font-bold mb-4 text-center">Login</h2>

        <form onSubmit={submit} className="grid gap-3">
          <input
            onChange={(e) => setEmail(e.target.value)}
            className="p-2 rounded bg-gray-800 border border-gray-700"
            placeholder="Email"
          />
          <input
            type="password"
            onChange={(e) => setPassword(e.target.value)}
            className="p-2 rounded bg-gray-800 border border-gray-700"
            placeholder="Password"
          />

          <motion.button
            whileTap={{ scale: 0.95 }}
            className="p-2 bg-blue-600 rounded font-semibold hover:bg-blue-500"
          >
            Sign In
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}
