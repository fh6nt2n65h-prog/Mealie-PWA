import { motion } from 'framer-motion'

type Props = { open: boolean; className?: string }

export function ChefHat({ open, className }: Props) {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      animate={{ rotate: open ? 360 : 0 }}
      transition={{ type: 'spring', stiffness: 160, damping: 15, duration: 0.9 }}
    >
      {/* Chef hat outline */}
      <path d="M17,21c.552285,0,1-.447715,1-1v-5.35c0-.457.316-.844.727-1.041c1.756856-.838091,2.655341-2.819196,2.128423-4.693042s-2.326244-3.096335-4.262423-2.895958C15.803559,4.184976,13.997631,2.995943,12,2.995943s-3.803559,1.189033-4.593,3.024057C5.471747,5.821032,3.67398,7.043301,3.147286,8.916102s.370441,3.852967,2.125714,4.691898c.411.198.727.585.727,1.041L6,20c0,.552285.447715,1,1,1h10Z" />
      {/* Hat band line */}
      <path d="M6,17h12" />
    </motion.svg>
  )
}
