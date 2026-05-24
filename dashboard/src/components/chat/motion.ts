/** Curvas e variantes compartilhadas do chat (alinhadas ao AppShell). */
export const chatEase = [0.22, 1, 0.36, 1] as const;

export const springSnappy = { type: 'spring' as const, stiffness: 420, damping: 32 };
export const springSoft = { type: 'spring' as const, stiffness: 320, damping: 28 };

export const fadeUp = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
  transition: { duration: 0.22, ease: chatEase },
};

export const slidePanel = {
  initial: { opacity: 0, x: 24 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -16 },
  transition: { duration: 0.28, ease: chatEase },
};

export const messagePop = {
  initial: { opacity: 0, y: 8, scale: 0.94 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { duration: 0.2, ease: chatEase },
};

export const listContainer = {
  initial: {},
  animate: {
    transition: { staggerChildren: 0.035, delayChildren: 0.04 },
  },
};

export const listItem = {
  initial: { opacity: 0, x: -12 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -8 },
  transition: { duration: 0.2, ease: chatEase },
};
