import { motion } from 'framer-motion';

export default function LoadingScreen() {
  return (
    <main className="loading-screen relative grid min-h-screen place-items-center overflow-hidden px-6">
      <motion.div
        animate={{ opacity: [0.55, 1, 0.55], scale: [0.99, 1, 0.99] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        className="loading-card"
      >
        <span className="loading-mark">R</span>
        <div className="loading-copy"><i/><i/><i/></div>
      </motion.div>
    </main>
  );
}
