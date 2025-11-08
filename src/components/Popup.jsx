import { motion } from "framer-motion";

export default function Popup({ text, onClose, color = "green" }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      className="fixed top-5 right-5 z-50"
    >
      <div
        className={`px-4 py-3 rounded-lg shadow-lg text-white bg-${color}-600 flex items-center gap-3`}
      >
        ✅ {text}
        <button
          className="px-2 bg-black/20 rounded"
          onClick={onClose}
        >
          ✖
        </button>
      </div>
    </motion.div>
  );
}
