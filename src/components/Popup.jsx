import { motion, AnimatePresence } from "framer-motion";

export default function Popup({ text, onClose, color = "green" }) {
  // Tailwind-safe color mapping (prevents purge issues)
  const colorClasses = {
    green: "bg-green-600",
    blue: "bg-blue-600",
    red: "bg-red-600",
    yellow: "bg-yellow-600",
    purple: "bg-purple-600",
    emerald: "bg-emerald-600",
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.92 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        className="fixed top-5 right-5 z-50"
      >
        <div
          className={`px-4 py-3 rounded-xl shadow-xl backdrop-blur-sm flex items-center gap-3 text-white ${colorClasses[color] || colorClasses.green}`}
        >
          <span className="text-lg">✔</span>
          <span className="font-medium">{text}</span>

          <button
            onClick={onClose}
            className="ml-2 px-2 py-1 hover:bg-white/20 rounded transition"
          >
            ✖
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
