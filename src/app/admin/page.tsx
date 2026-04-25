'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Stats {
  totalDrivers: number
  availableDrivers: number
  totalMotorcycles: number
  pendingServices: number
  activeServices: number
  openBreakdowns: number
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalDrivers: 0,
    availableDrivers: 0,
    totalMotorcycles: 0,
    pendingServices: 0,
    activeServices: 0,
    openBreakdowns: 0,
  })
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function loadStats() {
      const [
        { count: totalDrivers },
        { count: availableDrivers },
        { count: totalMotorcycles },
        { count: pendingServices },
        { count: activeServices },
        { count: openBreakdowns },
      ] = await Promise.all([
        supabase.from('drivers').select('*', { count: 'exact', head: true }),
        supabase.from('drivers').select('*', { count: 'exact', head: true }).eq('status', 'available'),
        supabase.from('motorcycles').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('service_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('service_requests').select('*', { count: 'exact', head: true }).eq('status', 'in_progress'),
        supabase.from('breakdown_reports').select('*', { count: 'exact', head: true }).neq('status', 'resolved'),
      ])

      setStats({
        totalDrivers: totalDrivers ?? 0,
        availableDrivers: availableDrivers ?? 0,
        totalMotorcycles: totalMotorcycles ?? 0,
        pendingServices: pendingServices ?? 0,
        activeServices: activeServices ?? 0,
        openBreakdowns: openBreakdowns ?? 0,
      })
      setLoading(false)
    }

    loadStats()
  }, [])

  const cards = [
    { label: 'Conductores totales', value: stats.totalDrivers, sub: `${stats.availableDrivers} disponibles`, color: 'bg-blue-500' },
    { label: 'Motos activas', value: stats.totalMotorcycles, sub: 'en operación', color: 'bg-green-500' },
    { label: 'Servicios pendientes', value: stats.pendingServices, sub: 'sin asignar', color: 'bg-yellow-500' },
    { label: 'Servicios en curso', value: stats.activeServices, sub: 'ahora mismo', color: 'bg-orange-500' },
    { label: 'Averías abiertas', value: stats.openBreakdowns, sub: 'sin resolver', color: 'bg-red-500' },
  ]

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h2>

      {loading ? (
        <p className="text-gray-500">Cargando...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((card) => (
            <div key={card.label} className="bg-white rounded-xl shadow-sm p-6 flex items-center gap-4">
              <div className={`${card.color} w-12 h-12 rounded-full flex items-center justify-center text-white text-xl font-bold`}>
                {card.value}
              </div>
              <div>
                <p className="font-semibold text-gray-800">{card.label}</p>
                <p className="text-sm text-gray-500">{card.sub}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
