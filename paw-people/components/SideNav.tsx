'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Dog, Pill, PlusCircle, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dogs', label: 'Patients', icon: Dog },
  { href: '/treatments/new', label: 'Log Treatment', icon: PlusCircle },
  { href: '/inventory', label: 'Inventory', icon: Pill },
]

export default function SideNav() {
  const pathname = usePathname()
  return (
    <aside className="hidden md:flex md:flex-col md:w-64 md:bg-white md:border-r md:border-gray-100 md:px-4 md:py-6 md:sticky md:top-0 md:h-screen">
      <Link href="/dashboard" className="flex items-center gap-3 px-3 mb-8">
        <img src="/logo.jpg" alt="Paw People" className="w-10 h-10 rounded-full object-cover" />
        <div>
          <p className="font-bold text-gray-900">Paw People</p>
          <p className="text-xs text-gray-500">Treatment Log</p>
        </div>
      </Link>
      <nav className="flex flex-col gap-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link key={href} href={href} className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
              active ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
            )}>
              <Icon size={18} strokeWidth={active ? 2.2 : 1.7} />
              <span>{label}</span>
            </Link>
          )
        })}
      </nav>
      <Link href="/settings" className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors mt-auto',
        pathname === '/settings' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
      )}>
        <Settings size={18} strokeWidth={pathname === '/settings' ? 2.2 : 1.7} />
        <span>Settings</span>
      </Link>
    </aside>
  )
}
