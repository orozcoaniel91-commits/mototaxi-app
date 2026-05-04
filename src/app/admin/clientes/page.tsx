'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ServiceRequest } from '@/lib/supabase/types'

interface CustomerSummary {
  phone: string
  name: string
  total: number
  completed: number
  cancelled: number
  totalSpent: number
  lastTrip: string
  trips: ServiceRequest[]
}

const statusLabels: Record<string, string> = {
  pending: 'Pendiente',
  assigned: 'Asignado',
  in_progress: 'En curso',
  completed: 'Completado',
  cancelled: 'Cancelado',
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  assigned: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-orange-100 text-orange-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600',
}

export default function ClientesPage() {
  const [customers, setCustomers] = useState<CustomerSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('service_requests')
        .select('*, drivers(name)')
        .order('requested_at', { ascending: false })

      if (!data) { setLoading(false); return }

      const map = new Map<string, CustomerSummary>()
      for (const trip of data) {
        const key = trip.customer_phone
        if (!map.has(key)) {
          map.set(key, {
            phone: trip.customer_phone,
            name: trip.customer_name,
            total: 0,
            completed: 0,
            cancelled: 0,
            totalSpent: 0,
            lastTrip: trip.requested_at,
            trips: [],
          })
        }
        const c = map.get(key)!
        c.total++
        if (trip.status === 'completed') { c.completed++; c.totalSpent += trip.fare ?? 0 }
        if (trip.status === 'cancelled') c.cancelled++
        if (trip.requested_at > c.lastTrip) c.lastTrip = trip.requested_at
        c.trips.push(trip)
      }

      setCustomers(Array.from(map.values()).sort((a, b) => b.lastTrip.localeCompare(a.lastTrip)))
      setLoading(false)
    }
    load()
  }, [])

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Clientes</h2>
          <p className="text-sm text-gray-400 mt-0.5">Historial de viajes por cliente</p>
        </div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nombre o teléfono..."
          className="border rounded-lg px-4 py-2 text-sm w-72 focus:outline-none focus:ring-2 focus:ring-orange-400"
        />
      </div>

      {loading ? (
        <p className="text-gray-500">Cargando...</p>
      ) : (
        <div className="space-y-3">
          {filtered.length === 0 && (
            <div className="bg-white rounded-xl shadow-sm p-8 text-center text-gray-400">
              No se encontraron clientes
            </div>
          )}
          {filtered.map(customer => (
            <div key={customer.phone} className="bg-white rounded-xl shadow-sm overflow-hidden">
              {/* Fila del cliente */}
              <button
                onClick={() => setExpanded(expanded === customer.phone ? null : customer.phone)}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-sm">
                    {customer.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">{customer.name}</p>
                    <p className="text-sm text-gray-400">{customer.phone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-8 text-sm">
                  <div className="text-center">
                    <p className="font-bold text-gray-800">{customer.total}</p>
                    <p className="text-gray-400 text-xs">viajes</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-green-600">{customer.completed}</p>
                    <p className="text-gray-400 text-xs">completados</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-orange-500">${customer.totalSpent.toFixed(2)}</p>
                    <p className="text-gray-400 text-xs">gastado</p>
                  </div>
                  <div className="text-center hidden md:block">
                    <p className="font-medium text-gray-600">{new Date(customer.lastTrip).toLocaleDateString('es')}</p>
                    <p className="text-gray-400 text-xs">último viaje</p>
                  </div>
                  <span className="text-gray-400 text-lg">{expanded === customer.phone ? '▲' : '▼'}</span>
                </div>
              </button>

              {/* Historial de viajes */}
              {expanded === customer.phone && (
                <div className="border-t divide-y">
                  {customer.trips.map(trip => (
                    <div key={trip.id} className="px-6 py-4 flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[trip.status] ?? 'bg-gray-100 text-gray-600'}`}>
                            {statusLabels[trip.status] ?? trip.status}
                          </span>
                          <span className="text-xs text-gray-400">
                            {new Date(trip.requested_at).toLocaleString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 truncate">
                          <span className="text-gray-400">Recogida:</span> {trip.pickup_address ?? `${trip.pickup_lat}, ${trip.pickup_lng}`}
                        </p>
                        {trip.destination_address && (
                          <p className="text-sm text-gray-700 truncate">
                            <span className="text-gray-400">Destino:</span> {trip.destination_address}
                          </p>
                        )}
                        {trip.drivers && (
                          <p className="text-xs text-gray-400 mt-1">Conductor: {trip.drivers.name}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        {trip.fare != null ? (
                          <p className="font-bold text-green-600">${trip.fare.toFixed(2)}</p>
                        ) : (
                          <p className="text-gray-300 text-sm">—</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
