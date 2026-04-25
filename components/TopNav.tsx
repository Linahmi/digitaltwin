'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, User, Activity, Mic, Bell, Settings } from 'lucide-react'

export function TopNav() {
  const pathname = usePathname()

  const navItems = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'Profile', href: '/profile', icon: User },
    { name: 'Timeline', href: '/timeline', icon: Activity },
    { name: 'Voice', href: '/voice', icon: Mic },
  ]

  return (
    <nav className="sticky top-0 z-50 w-full bg-white border-b border-[#E5E5E5]">
      <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between">
        {/* Brand / Logo */}
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-[#F8FAFC] border border-[#E5E5E5] flex items-center justify-center">
            <span className="text-[#1a1a1a] font-medium text-xs tracking-wider">DHT</span>
          </div>
          <span className="text-[#1a1a1a] font-medium tracking-tight ml-1">BioSync Analytics</span>
        </div>

        {/* Navigation Links */}
        <div className="hidden md:flex items-center gap-6">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-2 text-sm font-medium transition-colors duration-200 ${
                  isActive
                    ? 'text-[#1a1a1a]'
                    : 'text-[#999] hover:text-[#555]'
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            )
          })}
        </div>

        {/* User / Actions */}
        <div className="flex items-center gap-4">
          <button className="text-[#999] hover:text-[#555] transition-colors">
            <Bell className="h-5 w-5" />
          </button>
          <button className="text-[#999] hover:text-[#555] transition-colors">
            <Settings className="h-5 w-5" />
          </button>
          <div className="h-8 w-8 rounded-full bg-[#F8FAFC] border border-[#E5E5E5] flex items-center justify-center ml-2">
            <User className="h-4 w-4 text-[#888]" />
          </div>
        </div>
      </div>
    </nav>
  )
}
