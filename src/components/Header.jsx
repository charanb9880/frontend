import React from 'react'
import { Link, useNavigate } from 'react-router-dom'

export default function Header() {
  const navigate = useNavigate()
  const token = localStorage.getItem('token')
  const role = localStorage.getItem('role')

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    localStorage.removeItem('status')
    navigate('/')
  }

  return (
    <header className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-indigo-500 shadow-neon"></div>
        <h1 className="text-xl font-bold">TradeRace</h1>
      </div>

      <nav className="flex gap-4 text-sm">
        {/* Always visible */}
        <Link to="/" className="hover:text-indigo-400">Home</Link>

        {/* ✅ Normal User Dashboard only */}
        {token && role !== 'ADMIN' && (
          <Link to="/dashboard" className="hover:text-indigo-400">Dashboard</Link>
        )}

        {/* ✅ Leaderboard only for Admin */}
        {token && role === 'ADMIN' && (
          <Link to="/leaderboard" className="hover:text-indigo-400">Leaderboard</Link>
        )}



        {/* Login/Register only if not logged in */}
        {!token && <Link to="/login" className="hover:text-indigo-400">Login</Link>}
        {!token && <Link to="/register" className="hover:text-indigo-400">Register</Link>}

        {/* Logout if logged in */}
        {token && (
          <button
            onClick={logout}
            className="px-3 py-1 bg-red-600/80 rounded hover:bg-red-600"
          >
            Logout
          </button>
        )}
      </nav>
    </header>
  )
}
