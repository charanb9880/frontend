import React, { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import Popup from "../components/Popup";

const API = import.meta.env.VITE_API_URL;

export default function Register() {
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [popup, setPopup] = useState("");

  async function register(e) {
    e.preventDefault();
    const r = await fetch(`${API}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password: pass }),
    });

    const j = await r.json();
    if (!r.ok) return setPopup(j.error || "Registration failed");

    setPopup("Registration successful ✅ Waiting for admin approval");
    setTimeout(() => nav("/login"), 1500);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">

      {popup && (
        <Popup
          text={popup}
          color="blue"
          onClose={() => setPopup("")}
        />
      )}

      <motion.div
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gray-900/60 p-6 w-96 rounded-xl border border-gray-800 shadow-xl"
      >
        <h2 className="text-xl font-bold mb-4 text-center">Register</h2>

        <form onSubmit={register} className="grid gap-3">
          <input
            onChange={(e) => setName(e.target.value)}
            className="p-2 rounded bg-gray-800 border border-gray-700"
            placeholder="Full Name"
          />
          <input
            onChange={(e) => setEmail(e.target.value)}
            className="p-2 rounded bg-gray-800 border border-gray-700"
            placeholder="Email"
          />
          <input
            type="password"
            onChange={(e) => setPass(e.target.value)}
            className="p-2 rounded bg-gray-800 border border-gray-700"
            placeholder="Password"
          />

          <motion.button
            whileTap={{ scale: 0.95 }}
            className="p-2 bg-green-600 rounded font-semibold hover:bg-green-500"
          >
            Register
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}
