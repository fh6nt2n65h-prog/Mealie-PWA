import clsx from 'clsx'
import { useEffect, useRef } from 'react'
import { motion, useAnimationControls } from 'framer-motion'
import { Heart } from 'lucide-react'

type AnimatedHeartIconProps = {
  active: boolean
  className?: string
  activeClassName?: string
  inactiveClassName?: string
}

export function AnimatedHeartIcon({
  active,
  className,
  activeClassName = 'fill-terracotta/70 text-terracotta/70',
  inactiveClassName = 'text-oliveGray'
}: AnimatedHeartIconProps) {
  const controls = useAnimationControls()
  const mountedRef = useRef(false)

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true
      return
    }

    controls.set({ scale: 1 })
    void controls.start({
      scale: [1, 1.42, 0.84, 1.12, 1],
      transition: { duration: 0.34, times: [0, 0.28, 0.56, 0.82, 1] }
    })
  }, [active, controls])

  return (
    <motion.span animate={controls} className="inline-flex origin-center">
      <Heart className={clsx('transition-colors', className, active ? activeClassName : inactiveClassName)} />
    </motion.span>
  )
}