'use client'

import {
  motion,
  useReducedMotion,
  type HTMLMotionProps,
} from 'framer-motion'
import {
  forwardRef,
  type CSSProperties,
  type ElementType,
  type ReactNode,
} from 'react'

const EASE = [0.22, 1, 0.36, 1] as const

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0 },
}

type MotionTag = 'section' | 'div' | 'main' | 'header' | 'footer' | 'article'

type MotionSectionProps = {
  children: ReactNode
  className?: string
  style?: CSSProperties
  id?: string
  /** HTML element to render. Defaults to section. */
  as?: MotionTag
  /** Stagger delay in seconds. */
  delay?: number
  /** Animate on mount instead of scroll (hero / above-the-fold). */
  immediate?: boolean
} & Omit<HTMLMotionProps<'div'>, 'children' | 'as'>

/**
 * Shared scroll-triggered fade-in + slide-up wrapper.
 * Honors prefers-reduced-motion via Framer's useReducedMotion.
 */
export const MotionSection = forwardRef<HTMLElement, MotionSectionProps>(
  function MotionSection(
    {
      children,
      className,
      style,
      id,
      as = 'section',
      delay = 0,
      immediate = false,
      ...rest
    },
    ref,
  ) {
    const reduce = useReducedMotion()
    const Tag = (motion[as] ?? motion.section) as ElementType

    if (reduce) {
      const Static = as
      return (
        <Static className={className} style={style} id={id} ref={ref as never}>
          {children}
        </Static>
      )
    }

    const transition = {
      duration: 0.55,
      delay,
      ease: EASE,
    }

    if (immediate) {
      return (
        <Tag
          className={className}
          style={style}
          id={id}
          ref={ref}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          transition={transition}
          {...rest}
        >
          {children}
        </Tag>
      )
    }

    return (
      <Tag
        className={className}
        style={style}
        id={id}
        ref={ref}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.15, margin: '0px 0px -40px 0px' }}
        variants={fadeUp}
        transition={transition}
        {...rest}
      >
        {children}
      </Tag>
    )
  },
)

/** Fixed, slow-shifting gradient backdrop for the Slate dark theme. */
export function GradientBackground() {
  const reduce = useReducedMotion()
  return (
    <div
      aria-hidden
      className={`slate-gradient-bg${reduce ? ' slate-gradient-bg--static' : ''}`}
    />
  )
}
