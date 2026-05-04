'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: '📊' },
  { href: '/admin/map', label: 'Mapa en vivo', icon: '🗺️' },
  { href: '/admin/drivers', label: 'Conductores', icon: '👤' },
  { href: '/admin/motorcycles', label: 'Motos', icon: '🏍️' },
  { href: '/admin/zones', label: 'Zonas', icon: '📍' },
  { href: '/admin/services', label: 'Servicios', icon: '📋' },
  { href: '/admin/breakdowns', label: 'Averías', icon: '🔧' },
  { href: '/admin/planes', label: 'Planes fijos', icon: '🔄' },
  { href: '/admin/clientes', label: 'Clientes', icon: '👥' },
  { href: '/admin/usuarios', label: 'Usuarios', icon: '🔑' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    const id = localStorage.getItem('admin_id')
    if (!id && pathname !== '/admin/login') {
      router.replace('/admin/login')
    } else {
      setUsername(localStorage.getItem('admin_username') ?? '')
      setChecked(true)
    }
  }, [pathname])

  // Render login page without sidebar
  if (pathname === '/admin/login') {
    return <>{children}</>
  }

  if (!checked) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-white text-sm">Cargando...</p>
      </div>
    )
  }

  function logout() {
    localStorage.removeItem('admin_id')
    localStorage.removeItem('admin_username')
    localStorage.removeItem('admin_role')
    router.push('/admin/login')
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <aside className="w-64 bg-gray-900 text-white flex flex-col">
        <div className="p-6 border-b border-gray-700">
          <h1 className="text-xl font-bold">MotoTaxi</h1>
          <p className="text-gray-400 text-sm mt-1">Panel de administración</p>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
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
        <div className="p-4 border-t border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400">Conectado como</p>
              <p className="text-sm font-medium text-white">{username}</p>
            </div>
            <button
              onClick={logout}
              className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-gray-800 transition-colors"
            >
              Salir
            </button>
          </div>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-8">
        {children}
      </main>
    </div>
  )
}
