'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import { Driver } from '@/lib/supabase/types'

const DriversMap = dynamic(() => import('@/components/DriversMap'), { ssr: false })

const statusColors: Record<string, string> = {
  available: 'bg-green-500',
  busy: 'bg-orange-500',
  offline: 'bg-gray-400',
  breakdown: 'bg-red-500',
}

const statusLabels: Record<string, string> = {
  available: 'Disponible',
  busy: 'En servicio',
  offline: 'Desconectado',
  breakdown: 'Avería',
}

export default function MapPage() {
  const [drivers, setDrivers] = useState<Driver[]>([])
  const supabase = createClient()

  async function loadDrivers() {
    const { data } = await supabase
      .from('drivers')
      .select('*')
      .neq('status', 'offline')
    setDrivers(data ?? [])
  }

  useEffect(() => {
    loadDrivers()

    // Realtime: actualizar cuando un conductor mueve ubicación o cambia estado
    const channel = supabase
      .channel('drivers_map')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'drivers',
      }, () => loadDrivers())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const activeCount = drivers.filter(d => d.status === 'available').length
  const busyCount = drivers.filter(d => d.status === 'busy').length
  const breakdownCount = drivers.filter(d => d.status === 'breakdown').length

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Mapa en tiempo real</h2>
        <div className="flex gap-3">
          {[
            { label: 'Disponibles', count: activeCount, color: 'bg-green-500' },
            { label: 'En servicio', count: busyCount, color: 'bg-orange-500' },
            { label: 'Averías', count: breakdownCount, color: 'bg-red-500' },
          ].map(item => (
            <div key={item.label} className="bg-white rounded-xl px-4 py-2 flex items-center gap-2 shadow-sm">
              <span className={`w-3 h-3 rounded-full ${item.color}`}></span>
              <span className="text-sm font-medium text-gray-700">{item.count} {item.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Mapa */}
        <div className="flex-1 bg-white rounded-xl shadow-sm overflow-hidden" style={{ minHeight: '500px' }}>
          <DriversMap drivers={drivers} />
        </div>

        {/* Lista lateral */}
        <div className="w-64 bg-white rounded-xl shadow-sm overflow-auto">
          <div className="p-4 border-b">
            <p className="font-semibold text-gray-700 text-sm">Conductores activos ({drivers.length})</p>
          </div>
          <div className="divide-y">
            {drivers.length === 0 && (
              <p className="p-4 text-sm text-gray-400 text-center">Sin conductores activos</p>
            )}
            {drivers.map(driver => (
              <div key={driver.id} className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-2 h-2 rounded-full ${statusColors[driver.status]}`}></span>
                  <p className="font-medium text-sm text-gray-800">{driver.name}</p>
                </div>
                <p className="text-xs text-gray-400 ml-4">{driver.phone}</p>
                <p className="text-xs ml-4 mt-1">
                  <span className={`px-2 py-0.5 rounded-full text-white text-xs ${statusColors[driver.status]}`}>
                    {statusLabels[driver.status]}
                  </span>
                </p>
                {driver.last_location_update && (
                  <p className="text-xs text-gray-300 ml-4 mt-1">
                    Última ubicación: {new Date(driver.last_location_update).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
