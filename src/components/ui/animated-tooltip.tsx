import * as React from 'react';
import { useState, useId, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, type Variants } from 'framer-motion';
import { cn } from '@/src/lib/utils';

/**
 * Animated Tooltip
 * Bouncy, playful tooltip shapes with SVG bubbles and spring animations.
 * Inspired by Codrops' "Tooltip Animations" (originally anime.js), rebuilt
 * on framer-motion with theme-adaptive colors.
 *
 * Extended for OmniMarket:
 *  - theme-aware colors (brand accent, ink/app tokens for light+dark)
 *  - smart placement (top/bottom/left/right) with viewport clamping + flipping
 *  - portal rendering so bubbles never get clipped by overflow containers
 *    or hidden under modals
 *  - touch support (tap to open, tap outside to dismiss)
 *  - prefers-reduced-motion support (subtle fade instead of spring transforms)
 *  - keyboard access via the trigger (tabIndex 0 + aria-describedby)
 */

export type AnimatedTooltipVariant =
  | 'cora'
  | 'smaug'
  | 'dori'
  | 'gram'
  | 'indis'
  | 'malva'
  | 'sadoc';

export type AnimatedTooltipPlacement = 'top' | 'bottom' | 'left' | 'right';

/**
 * Semantic intent -> variant mapping.
 * Use `intent` in new integrations instead of picking a shape by eye so the
 * product keeps a consistent voice: smaug for navigation, cora for friendly
 * discovery, dori for announcements, gram for stats, indis for admin details,
 * malva (sparingly) for alerts, sadoc for help/terminology.
 */
export const TOOLTIP_INTENT: Record<string, AnimatedTooltipVariant> = {
  navigation: 'smaug',
  discovery: 'cora',
  announcement: 'dori',
  stats: 'gram',
  admin: 'indis',
  alert: 'malva',
  help: 'sadoc',
};

export type TooltipIntent = keyof typeof TOOLTIP_INTENT;

interface VariantConfig {
  /** Bubble size in px. */
  width: number;
  height: number;
  /** transform-origin for the entrance animation. */
  transformOrigin: string;
  /** SVG path(s) rendered inside a `0 0 400 300` viewBox. */
  shape: (fill: string) => React.ReactNode;
  /** Bubble (base) entrance/exit animation, transitions embedded per state. */
  base: Variants;
  /** Inner content entrance/exit animation, transitions embedded per state. */
  content: Variants;
  /** Extra styles for the content wrapper. */
  contentStyle?: React.CSSProperties;
}

const EASE_OUT_QUINT: [number, number, number, number] = [0.22, 1, 0.36, 1];
const EASE_IN: [number, number, number, number] = [0.55, 0, 1, 0.45];

const VARIANTS: Record<AnimatedTooltipVariant, VariantConfig> = {
  // Blobby heart — scales up while un-rotating.
  cora: {
    width: 232,
    height: 174,
    transformOrigin: '50% 100%',
    shape: (fill) => (
      <path
        d="M 199,21.9 C 152,22.2 109,35.7 78.8,57.4 48,79.1 29,109 29,142 29,172 45.9,201 73.6,222 101,243 140,258 183,260 189,270 200,282 200,282 200,282 211,270 217,260 261,258 299,243 327,222 354,201 371,172 371,142 371,109 352,78.7 321,57 290,35.3 247,21.9 199,21.9 Z"
        fill={fill}
      />
    ),
    base: {
      initial: { scale: 0, rotate: -180, opacity: 0 },
      animate: { scale: 1, rotate: 0, opacity: 1, transition: { duration: 0.6, ease: EASE_OUT_QUINT } },
      exit: { scale: 0, opacity: 0, transition: { duration: 0.18, ease: EASE_IN } },
    },
    content: {
      initial: { y: 20, opacity: 0 },
      animate: { y: 0, opacity: 1, transition: { duration: 0.3, delay: 0.25, ease: EASE_OUT_QUINT } },
      exit: { y: 20, opacity: 0, transition: { duration: 0.1, ease: EASE_IN } },
    },
    contentStyle: { marginBottom: '0.75em' },
  },

  // Rounded pill with a downward pointer — tips in with a slide.
  smaug: {
    width: 240,
    height: 180,
    transformOrigin: '50% 100%',
    shape: (fill) => (
      <path
        d="M 314,100 C 313,100 312,100 311,100 L 89.5,100 C 55.9,100 29.1,121 29.1,150 29.1,178 53.1,201 89.5,201 L 184,201 200,223 217,201 311,201 C 344,201 371,178 371,150 371,122 346,99 314,100 Z"
        fill={fill}
      />
    ),
    base: {
      initial: { rotate: 35, opacity: 0 },
      animate: { rotate: 0, opacity: 1, transition: { duration: 0.2, ease: 'easeOut' } },
      exit: { rotate: -35, opacity: 0, transition: { duration: 0.2, ease: EASE_IN } },
    },
    content: {
      initial: { x: 50, rotate: 6, opacity: 0 },
      animate: { x: 0, rotate: 0, opacity: 1, transition: { type: 'spring', stiffness: 260, damping: 12, delay: 0.05 } },
      exit: { x: -30, rotate: -6, opacity: 0, transition: { duration: 0.2, ease: EASE_IN } },
    },
  },

  // Banner ribbon with a pointer — drops in with elastic bounce.
  dori: {
    width: 240,
    height: 180,
    transformOrigin: '50% 0%',
    shape: (fill) => (
      <path
        d="M 22,108 22,236 C 22,236 64,216 103,212 142,208 184,212 184,212 L 200,229 216,212 C 216,212 258,207 297,212 336,217 378,236 378,236 L 378,108 C 378,108 318,83.7 200,83.7 82,83.7 22,108 22,108 Z"
        fill={fill}
      />
    ),
    base: {
      initial: { y: -60, scale: 0.5, opacity: 0 },
      animate: { y: 0, scale: 1, opacity: 1, transition: { type: 'spring', bounce: 0.5, duration: 0.8 } },
      exit: { y: -60, scale: 0.5, opacity: 0, transition: { duration: 0.2, ease: EASE_IN } },
    },
    content: {
      initial: { y: 20, opacity: 0 },
      animate: { y: 0, opacity: 1, transition: { duration: 0.3, delay: 0.1, ease: EASE_OUT_QUINT } },
      exit: { y: 20, opacity: 0, transition: { duration: 0.1, ease: EASE_IN } },
    },
    contentStyle: { marginBottom: '0.75em' },
  },

  // Wavy blob — squashes horizontally on entry.
  gram: {
    width: 240,
    height: 180,
    transformOrigin: '50% 100%',
    shape: (fill) => (
      <path
        d="M 92.4,79 C 136,79 154,115 200,116 246,117 263,80.4 308,79 353,77.6 381,111 381,150 381,189 346,220 308,221 270,222 236,188 200,188 164,188 130,222 92.4,221 54.4,220 19,189 19,150 19,111 48.6,79 92.4,79 Z"
        fill={fill}
      />
    ),
    base: {
      initial: { scaleX: 1.2, opacity: 0 },
      animate: { scaleX: 1, opacity: 1, transition: { duration: 0.4, ease: EASE_OUT_QUINT } },
      exit: { scaleX: 1.1, scaleY: 0.9, opacity: 0, transition: { duration: 0.2, ease: EASE_IN } },
    },
    content: {
      initial: { scale: 0.8, opacity: 0 },
      animate: { scale: 1, opacity: 1, transition: { duration: 0.3, delay: 0.1, ease: EASE_OUT_QUINT } },
      exit: { scale: 0.8, opacity: 0, transition: { duration: 0.15, ease: EASE_IN } },
    },
  },

  // Rounded rectangle — rises from below with a spring.
  indis: {
    width: 240,
    height: 180,
    transformOrigin: '50% 100%',
    shape: (fill) => (
      <path
        d="M 44.5,24 C 148,24 252,24 356,24 367,24 376,32.9 376,44 L 376,256 C 376,267 367,276 356,276 252,276 148,276 44.5,276 33.4,276 24.5,267 24.5,256 L 24.5,44 C 24.5,32.9 33.4,24 44.5,24 Z"
        fill={fill}
      />
    ),
    base: {
      initial: { y: 100, scaleX: 0.3, scaleY: 1.3, opacity: 0 },
      animate: { y: 0, scaleX: 1, scaleY: 1, opacity: 1, transition: { type: 'spring', bounce: 0.45, duration: 0.9 } },
      exit: { y: 100, scaleX: 0, scaleY: 1.5, opacity: 0, transition: { duration: 0.25, ease: EASE_IN } },
    },
    content: {
      initial: { y: 10, opacity: 0 },
      animate: { y: 0, opacity: 1, transition: { duration: 0.3, delay: 0.08, ease: 'easeOut' } },
      exit: { y: -20, opacity: 0, transition: { duration: 0.15, ease: EASE_IN } },
    },
  },

  // Spiky starburst — pops in with a jiggle.
  malva: {
    width: 220,
    height: 165,
    transformOrigin: '50% 100%',
    shape: (fill) => (
      <path
        d="M 94.9,90.2 101,30.7 163,72.3 229,17.7 263,68.2 319,55.9 315,102 375,144 316,175 340,228 265,220 251,263 180,233 143,282 98.9,218 57.5,236 82,189 25,170 82.8,141 48.7,93.7 Z"
        fill={fill}
      />
    ),
    base: {
      initial: { scale: 0, rotate: -20, opacity: 0 },
      animate: { scale: [0, 1.15, 1], rotate: [-20, 6, 0], opacity: 1, transition: { duration: 0.7, ease: EASE_OUT_QUINT, times: [0, 0.6, 1] } },
      exit: { scale: 0, opacity: 0, transition: { duration: 0.18, ease: EASE_IN } },
    },
    content: {
      initial: { scale: 0.7, opacity: 0 },
      animate: { scale: 1, opacity: 1, transition: { duration: 0.3, delay: 0.25, ease: EASE_OUT_QUINT } },
      exit: { scale: 0.7, opacity: 0, transition: { duration: 0.1, ease: EASE_IN } },
    },
    contentStyle: { width: '55%' },
  },

  // Outlined speech bubble — springs up from the trigger.
  sadoc: {
    width: 240,
    height: 180,
    transformOrigin: '50% 100%',
    shape: (fill) => (
      <path
        d="M 32.1,42.7 54.5,257 185,257 193,269 200,282 207,269 214,257 342,257 368,23.9 Z"
        fill={fill}
        stroke="var(--om-ink-3)"
        strokeWidth={3}
        strokeLinejoin="round"
      />
    ),
    base: {
      initial: { y: -40, opacity: 0 },
      animate: { y: 0, opacity: 1, transition: { type: 'spring', bounce: 0.5, duration: 0.8 } },
      exit: { y: -40, opacity: 0, transition: { duration: 0.2, ease: EASE_IN } },
    },
    content: {
      initial: { y: 20, opacity: 0 },
      animate: { y: 0, opacity: 1, transition: { type: 'spring', bounce: 0.4, duration: 0.8, delay: 0.2 } },
      exit: { y: 20, opacity: 0, transition: { duration: 0.15, ease: EASE_IN } },
    },
    contentStyle: { marginBottom: '1.25em' },
  },
};

/** Rotation to apply to the SVG shape so its pointer faces the trigger. */
const SHAPE_ROTATION: Record<AnimatedTooltipPlacement, number> = {
  top: 0,
  bottom: 180,
  left: -90,
  right: 90,
};

const FADE_VARIANTS: Variants = {
  initial: { opacity: 0, scale: 0.96 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.16, ease: 'easeOut' } },
  exit: { opacity: 0, scale: 0.96, transition: { duration: 0.12, ease: 'easeIn' } },
};

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

export interface AnimatedTooltipProps {
  /** The trigger label (usually a word or short phrase). */
  children: React.ReactNode;
  /** The tooltip body content revealed on hover/focus/tap. */
  content: React.ReactNode;
  /** Which shape + animation style to use. Defaults to "cora". */
  variant?: AnimatedTooltipVariant;
  /** Semantic intent shorthand — maps to a variant. */
  intent?: TooltipIntent;
  /** Preferred side of the trigger the bubble appears on. Auto-flips when it
      would leave the viewport. Defaults to "top". */
  placement?: AnimatedTooltipPlacement;
  /** Trigger text color while the tooltip is open. Defaults to brand accent. */
  accentColor?: string;
  /** Trigger text color while the tooltip is closed. Defaults to ink-1 so the
      trigger stays legible in default text regions; pass an explicit value for
      triggers sitting on coloured/gradient surfaces. */
  triggerColor?: string;
  /** Bubble fill color. Defaults to the theme foreground token. */
  shapeColor?: string;
  /** Tooltip text color. Defaults to the theme background token. */
  textColor?: string;
  /** Optional title rendered bold above the content. */
  title?: React.ReactNode;
  /** Optional icon rendered before the trigger label. */
  icon?: React.ReactNode;
  /** Additional classes for the inline wrapper. */
  className?: string;
  /** Additional classes for the trigger label itself (overrides default padding). */
  triggerClassName?: string;
  /** ms to wait before opening on hover (focus/touch open instantly). */
  openDelay?: number;
  /** Render children plainly with no tooltip behaviour. */
  disabled?: boolean;
}

export function AnimatedTooltip({
  children,
  content,
  variant,
  intent,
  placement = 'top',
  accentColor = 'var(--om-primary)',
  triggerColor = 'var(--om-ink-1)',
  shapeColor = 'var(--om-ink-1)',
  textColor = 'var(--om-app-bg)',
  title,
  icon,
  className,
  triggerClassName,
  openDelay = 80,
  disabled,
}: AnimatedTooltipProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number; p: AnimatedTooltipPlacement } | null>(null);
  const reducedMotion = usePrefersReducedMotion();
  const cfg = VARIANTS[variant ?? TOOLTIP_INTENT[intent ?? 'discovery']] ?? VARIANTS.cora;
  const id = useId().replace(/:/g, '');

  const triggerRef = useRef<HTMLSpanElement>(null);
  const openRef = useRef(open);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  openRef.current = open;

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const tr = trigger.getBoundingClientRect();
    const gap = 10;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const bw = Math.min(cfg.width, vw - 24);
    const bh = Math.min(cfg.height, vh - 24);

    let p = placement;
    if (p === 'top' || p === 'bottom') {
      if (p === 'top' && tr.top - bh - gap < 0 && tr.bottom + bh + gap <= vh) p = 'bottom';
      else if (p === 'bottom' && tr.bottom + bh + gap > vh && tr.top - bh - gap >= 0) p = 'top';
    } else {
      if (p === 'left' && tr.left - bw - gap < 0 && tr.right + bw + gap <= vw) p = 'right';
      else if (p === 'right' && tr.right + bw + gap > vw && tr.left - bw - gap >= 0) p = 'left';
    }

    let x: number;
    let y: number;
    if (p === 'top' || p === 'bottom') {
      x = tr.left + tr.width / 2 - bw / 2;
      x = Math.max(gap, Math.min(x, vw - bw - gap));
      y = p === 'top' ? tr.top - bh - gap : tr.bottom + gap;
    } else {
      y = tr.top + tr.height / 2 - bh / 2;
      y = Math.max(gap, Math.min(y, vh - bh - gap));
      x = p === 'left' ? tr.left - bw - gap : tr.right + gap;
    }
    setPos({ x, y, p });
  }, [cfg, placement]);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const handle = () => updatePosition();
    window.addEventListener('resize', handle);
    window.addEventListener('scroll', handle, true);
    return () => {
      window.removeEventListener('resize', handle);
      window.removeEventListener('scroll', handle, true);
    };
  }, [open, updatePosition]);

  // Tap anywhere outside the trigger closes an open tooltip (touch dismissal).
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (triggerRef.current && !triggerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  const openWithDelay = () => {
    if (disabled) return;
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setOpen(true), openDelay);
  };
  const closeSoon = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    setOpen(false);
  };

  useEffect(() => () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
  }, []);

  const base = reducedMotion ? FADE_VARIANTS : cfg.base;
  const contentVariants = reducedMotion ? FADE_VARIANTS : cfg.content;

  return (
    <>
      <span
        ref={triggerRef}
        className={cn('relative inline-block', className)}
        onMouseEnter={openWithDelay}
        onMouseLeave={closeSoon}
        onFocus={openWithDelay}
        onBlur={closeSoon}
        onClick={() => {
          if (disabled) return;
          setOpen((o) => !o);
        }}
      >
        <motion.span
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-describedby={open ? id : undefined}
          className={cn('cursor-pointer select-none inline-block px-1.5 py-0.5 font-medium', triggerClassName)}
          animate={{ color: open ? accentColor : triggerColor }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          {icon}
          {children}
        </motion.span>
      </span>

      {pos && open && !disabled && typeof document !== 'undefined'
        ? createPortal(
            <AnimatePresence>
              {open && (
                <motion.span
                  key="base"
                  id={id}
                  role="tooltip"
                  variants={base}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  style={{
                    position: 'fixed',
                    left: pos.x,
                    top: pos.y,
                    width: Math.min(cfg.width, window.innerWidth - 24),
                    height: Math.min(cfg.height, window.innerHeight - 24),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transformOrigin: cfg.transformOrigin,
                    pointerEvents: 'none',
                    zIndex: 9999,
                  }}
                >
                  <svg
                    viewBox="0 0 400 300"
                    preserveAspectRatio="xMidYMid meet"
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                      transform: `rotate(${SHAPE_ROTATION[pos.p]}deg)`,
                      transformOrigin: 'center',
                    }}
                  >
                    {cfg.shape(shapeColor)}
                  </svg>
                  <motion.span
                    variants={contentVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    style={{
                      position: 'relative',
                      width: '70%',
                      textAlign: 'center',
                      fontSize: '0.82rem',
                      lineHeight: 1.45,
                      color: textColor,
                      ...cfg.contentStyle,
                    }}
                  >
                    {title ? (
                      <span style={{ display: 'block', fontWeight: 700, fontSize: '0.88rem', marginBottom: '0.3em' }}>
                        {title}
                      </span>
                    ) : null}
                    {content}
                  </motion.span>
                </motion.span>
              )}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </>
  );
}

export default AnimatedTooltip;
