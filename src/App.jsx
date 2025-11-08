import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Header from './components/Header.jsx'
import Landing from './pages/Landing.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Leaderboard from './pages/Leaderboard.jsx'
import AdminPanel from './pages/AdminPanel.jsx'

export default function App() {
  return (
    <div className="max-w-6xl mx-auto p-4">
      <Header />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  )
}
