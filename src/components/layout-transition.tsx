"use client";

import { motion } from "framer-motion";
import { usePathname } from "next/navigation";

interface LayoutTransitionProps {
  children: React.ReactNode;
  className?: string;
}

export function LayoutTransition({ children, className }: LayoutTransitionProps) {
  const pathname = usePathname();

  // Animate the new route in by re-keying on pathname. We intentionally avoid
  // AnimatePresence `mode="wait"` (which animates the old route out before
  // mounting the new one): on back navigation that left a gap where the URL had
  // already changed but the previous page was still mounted / the new one not
  // yet rendered, so the page appeared not to update.
  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.16, ease: "easeOut" }}
      className={className}
      style={{ height: "100%" }}
    >
      {children}
    </motion.div>
  );
}
