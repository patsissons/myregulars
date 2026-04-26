"use client";

import { motion } from "framer-motion";
import { useReducedMotion } from "@/lib/use-reduced-motion";

const containerVariants = {
  hidden: {},
  show: (staggerMs: number) => ({
    transition: {
      staggerChildren: staggerMs / 1000,
    },
  }),
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.32, ease: [0.2, 0.7, 0.3, 1] },
  },
};

const reducedItemVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.2 } },
};

interface AnimatedListProps {
  staggerMs?: number;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function AnimatedList({ staggerMs = 40, children, className, style }: AnimatedListProps) {
  return (
    <motion.div
      variants={containerVariants}
      custom={staggerMs}
      initial="hidden"
      animate="show"
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
}

interface AnimatedItemProps {
  children: React.ReactNode;
  className?: string;
}

export function AnimatedItem({ children, className }: AnimatedItemProps) {
  const reduced = useReducedMotion();

  return (
    <motion.div variants={reduced ? reducedItemVariants : itemVariants} className={className}>
      {children}
    </motion.div>
  );
}
