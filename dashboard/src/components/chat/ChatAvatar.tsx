import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { chatInitials, profilePicSrc } from '@/lib/chat';
import { cn } from '@/lib/cn';

const SIZES = {
  sm: 'size-8 text-[10px]',
  md: 'size-12 text-sm',
  msg: 'size-7 text-[10px]',
} as const;

export function ChatAvatar({
  contactId,
  name,
  isGroup,
  size = 'md',
  className,
}: {
  contactId?: string | null;
  name: string;
  isGroup?: boolean;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const reduce = useReducedMotion();
  const src = profilePicSrc(contactId);
  const showImg = !!src && !imgFailed;

  return (
    <motion.div
      layout={!reduce}
      className={cn(
        'relative shrink-0 overflow-hidden rounded-full bg-surface-hover',
        SIZES[size],
        className,
      )}
    >
      {showImg ? (
        <motion.img
          src={src}
          alt=""
          className="size-full object-cover"
          loading="lazy"
          initial={reduce ? false : { opacity: 0, scale: 1.08 }}
          animate={{ opacity: imgLoaded ? 1 : 0, scale: imgLoaded ? 1 : 1.08 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          onLoad={() => setImgLoaded(true)}
          onError={() => setImgFailed(true)}
        />
      ) : isGroup ? (
        <span className="flex size-full items-center justify-center bg-accent/20 text-accent">
          <svg viewBox="0 0 24 24" className="size-[55%]" fill="currentColor" aria-hidden>
            <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
          </svg>
        </span>
      ) : (
        <span className="flex size-full items-center justify-center font-semibold text-ink-dim">
          {chatInitials(name)}
        </span>
      )}
    </motion.div>
  );
}
