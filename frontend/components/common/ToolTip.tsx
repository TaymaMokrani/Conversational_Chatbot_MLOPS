'use client'

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface ToolTipProps {
  text: string
  className?: string
  side: 'top' | 'right' | 'bottom' | 'left' | undefined
  open?: boolean
  delay?: number
  children: React.ReactNode
}

export default function ToolTip({
  text,
  side,
  children,
  open,
  delay = 500,
  className = '',
}: ToolTipProps) {
  return (
    <Tooltip delayDuration={delay} open={open}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent className={className + ` transition-all!`} side={side}>
        <p className="text-white! dark:text-black!">{text}</p>
      </TooltipContent>
    </Tooltip>
  )
}
