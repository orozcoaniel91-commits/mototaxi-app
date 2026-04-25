'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: '📊' },
  { href: '/admin/map', label: 'Mapa en vivo', icon: '🗺️' },
  { href: '/admin/drivers', label: 'Conductores', icon: '👤' },
  { href: '/admin/motorcycles', label: 'Motos', icon: '🏍️' },
  { href: '/admin/zones', label: 'Zonas', icon: '📍' },
  { href: '/admin/services', label: 'Servicios', icon: '📋' },
  { href: '/admin/breakdowns', label: 'Averías', icon: '🔧' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex h-screen bg-gray-100">
      <aside className="w-64 bg-gray-900 text-white flex flex-col">
        <div className="p-6 border-b border-gray-700">
          <h1 className="text-xl font-bold">MotoTaxi</h1>
          <p className="text-gray-400 text-sm mt-1">Panel de administración</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-orange-500 text-white'
                    : 'text-gray-300 hover:bg-gray-800'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </aside>
      <main className="flex-1 overflow-auto p-8">
        {children}
      </main>
    </div>
  )
}
