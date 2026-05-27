'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Dog, Pill, PlusCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/dogs', label: 'Patients', icon: Dog },
  { href: '/treatments/new', label: 'Log', icon: PlusCircle, primary: true },
  { href: '/inventory', label: 'Inventory', icon: Pill },
]

export default function BottomNav() {
  const pathname = usePathname()
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50">
      <div className="max-w-lg mx-auto flex items-center justify-around px-2 h-16">
        {navItems.map(({ href, label, icon: Icon, primary }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link key={href} href={href} className={cn(
              'flex flex-col items-center gap-0.5 transition-all',
              primary
                ? 'bg-blue-600 text-white px-5 py-3 rounded-2xl shadow-lg shadow-blue-200 -mt-6'
                : 'px-3 py-1 ' + (active ? 'text-blue-600' : 'text-gray-400')
            )}>
              <Icon size={primary ? 22 : 20} strokeWidth={primary ? 2.5 : active ? 2 : 1.5} />
              {!primary && <span className="text-[10px] font-medium">{label}</span>}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
