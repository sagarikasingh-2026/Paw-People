'use client'
import { cn } from '@/lib/utils'

interface Props {
  children: React.ReactNode
  className?: string
}

// Renders content sticky to bottom on mobile, inline on desktop.
// Adds bottom-nav clearance on mobile (the bottom nav is 64px tall, plus 16px buffer)
export default function StickyFooter({ children, className }: Props) {
  return (
    <>
      {/* mobile: fixed positioning above bottom nav */}
      <div className={cn(
        'fixed left-0 right-0 z-40 bg-white border-t border-gray-100 p-4 md:hidden',
        'bottom-16',  // bottom nav is h-16
        className
      )}>
        <div className="max-w-lg mx-auto">
          {children}
        </div>
      </div>

      {/* desktop: render inline */}
      <div className="hidden md:block mt-6">
        {children}
      </div>
    </>
  )
}
