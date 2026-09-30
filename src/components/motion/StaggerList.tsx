"use client";

/**
 * Stagger children on mount or on scroll-into-view. Useful for lists
 * where you want items to appear in sequence (project grid, blog list,
 * timeline) rather than snap in all at once.
 *
 * Usage:
 *   <StaggerList>
 *     {items.map(item => (
 *       <StaggerItem key={item.id}><Card ...</StaggerItem>
 *     ))}
 *   </StaggerList>
 *
 * Same accessibility guarantees as FadeIn — reduced-motion collapses to
 * plain children with no animation.
 */

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

interface ListProps {
  children: ReactNode;
  className?: string;
  /** Seconds between each child's animation start. Default 0.06. */
  stagger?: number;
}

export function StaggerList({
  children,
  className,
  stagger = 0.06,
}: ListProps) {
  const reduced = useReducedMotion();

  if (reduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-5% 0px" }}
      variants={{
        hidden: {},
        show: {
          transition: { staggerChildren: stagger },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

interface ItemProps {
  children: ReactNode;
  className?: string;
}

export function StaggerItem({ children, className }: ItemProps) {
  const reduced = useReducedMotion();

  if (reduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 12 },
        show: {
          opacity: 1,
          y: 0,
          transition: {
            duration: 0.4,
            ease: [0.16, 1, 0.3, 1] as const,
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
}
