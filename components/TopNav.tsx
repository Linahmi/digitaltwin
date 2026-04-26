'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, User, Activity, Mic, Bell, Settings, Search } from 'lucide-react'

export function TopNav() {
  const pathname = usePathname()

  const navItems = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'Profile', href: '/profile', icon: User },
    { name: 'Timeline', href: '/timeline', icon: Activity },
    { name: 'Voice', href: '/voice', icon: Mic },
  ]

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-slate-200/70 bg-white/88 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-8">
        
        {/* Brand Section */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 border-r border-slate-200/80 pr-6 pl-1">
            <div className="relative h-9 w-9 overflow-hidden rounded-xl border border-sky-100/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(239,246,255,0.92))] shadow-[0_10px_28px_rgba(59,130,246,0.08)]">
              <Image
                src="/dualis-logo.png"
                alt="Dualis"
                width={160}
                height={160}
                priority
                className="h-full w-full scale-[2.4] object-cover object-top"
                style={{ transformOrigin: 'center 22%' }}
              />
            </div>
            <span className="text-sm font-semibold tracking-[0.18em] text-slate-700">DUALIS</span>
          </div>

          {/* Main Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-[13px] font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <item.icon className={`h-4 w-4 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                  {item.name}
                </Link>
              )
            })}
          </div>
        </div>

        {/* Global Search & Actions */}
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 mr-4 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-50 transition-all">
            <Search className="h-3.5 w-3.5 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search biomarkers..." 
              className="bg-transparent border-none outline-none text-xs text-gray-700 w-32 placeholder:text-gray-400"
            />
          </div>

          <div className="flex items-center gap-1 border-l border-gray-100 pl-3">
            <button className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-all">
              <Bell className="h-[18px] w-[18px]" />
            </button>
            <button className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-all">
              <Settings className="h-[18px] w-[18px]" />
            </button>
            <div className="h-8 w-8 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center ml-2 cursor-pointer hover:border-gray-300 transition-all">
              <User className="h-4 w-4 text-gray-600" />
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
