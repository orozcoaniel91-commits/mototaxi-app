'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ServiceRequest } from '@/lib/supabase/types'

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  assigned: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-orange-100 text-orange-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-600',
}

const statusLabels: Record<string, string> = {
  pending: 'Pendiente',
  assigned: 'Asignado',
  in_progress: 'En curso',
  completed: 'Completado',
  cancelled: 'Cancelado',
}

export default function ServicesPage() {
  const [services, setServices] = useState<ServiceRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const supabase = createClient()

  async function loadServices() {
    let query = supabase
      .from('service_requests')
      .select('*, drivers(name, phone), motorcycle_types(name)')
      .order('requested_at', { ascending: false })
      .limit(100)

    if (filter !== 'all') query = query.eq('status', filter)

    const { data } = await query
    setServices(data ?? [])
    setLoading(false)
  }

  useEffect(() => { loadServices() }, [filter])

  async function cancelService(id: string) {
    if (!confirm('¿Cancelar este servicio?')) return
    await supabase.from('service_requests').update({ status: 'cancelled' }).eq('id', id)
    loadServices()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Servicios</h2>
        <div className="flex gap-2">
          {['all', 'pending', 'assigned', 'in_progress', 'completed', 'cancelled'].map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                filter === s ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
            >
              {s === 'all' ? 'Todos' : statusLabels[s]}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-gray-500">Cargando...</p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-6 py-3 text-gray-600 font-medium">Cliente</th>
                <th className="text-left px-6 py-3 text-gray-600 font-medium">Recogida</th>
                <th className="text-left px-6 py-3 text-gray-600 font-medium">Destino</th>
                <th className="text-left px-6 py-3 text-gray-600 font-medium">Tipo moto</th>
                <th className="text-left px-6 py-3 text-gray-600 font-medium">Conductor</th>
                <th className="text-left px-6 py-3 text-gray-600 font-medium">Estado</th>
                <th className="text-left px-6 py-3 text-gray-600 font-medium">Hora</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {services.length === 0 && (
                <tr><td colSpan={8} className="px-6 py-8 text-center text-gray-400">No hay servicios</td></tr>
              )}
              {services.map(s => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <p className="font-medium">{s.customer_name}</p>
                    <p className="text-gray-400 text-xs">{s.customer_phone}</p>
                  </td>
                  <td className="px-6 py-4 text-gray-500 max-w-[150px] truncate">{s.pickup_address ?? '—'}</td>
                  <td className="px-6 py-4 text-gray-500 max-w-[150px] truncate">{s.destination_address ?? '—'}</td>
                  <td className="px-6 py-4 text-gray-500">{s.motorcycle_types?.name ?? 'Cualquiera'}</td>
                  <td className="px-6 py-4 text-gray-500">{s.drivers?.name ?? '—'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[s.status]}`}>
                      {statusLabels[s.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-400 text-xs">
                    {new Date(s.requested_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {['pending', 'assigned'].includes(s.status) && (
                      <button
                        onClick={() => cancelService(s.id)}
                        className="text-red-500 hover:text-red-700 text-xs"
                      >
                        Cancelar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
