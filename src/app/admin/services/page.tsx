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

function fmtTime(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function fmtDiff(from: string | null, to: string | null): string {
  if (!from || !to) return '—'
  const secs = Math.floor((new Date(to).getTime() - new Date(from).getTime()) / 1000)
  if (secs < 0) return '—'
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  if (h > 0) return `${h}h ${m}m ${s}s`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

function ServiceDetailModal({ service, onClose }: { service: ServiceRequest; onClose: () => void }) {
  const steps = [
    {
      label: 'Solicitud recibida',
      time: service.requested_at,
      diff: null,
      diffLabel: null,
      color: 'bg-gray-400',
    },
    {
      label: 'Conductor aceptó',
      time: service.accepted_at,
      diff: fmtDiff(service.requested_at, service.accepted_at),
      diffLabel: 'Tiempo de espera hasta aceptación',
      color: 'bg-blue-500',
    },
    {
      label: 'Viaje iniciado',
      time: service.started_at,
      diff: fmtDiff(service.accepted_at, service.started_at),
      diffLabel: 'Tiempo del conductor en llegar',
      color: 'bg-orange-500',
    },
    {
      label: 'Servicio completado',
      time: service.completed_at,
      diff: fmtDiff(service.started_at, service.completed_at),
      diffLabel: 'Duración del viaje',
      color: 'bg-green-500',
    },
  ]

  const totalTime = fmtDiff(service.requested_at, service.completed_at)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h3 className="font-bold text-gray-800 text-lg">Detalles del servicio</h3>
            <p className="text-xs text-gray-400">{service.customer_name} · {service.customer_phone}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        <div className="px-6 py-4 space-y-4">
          {/* Info básica */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Recogida</p>
              <p className="text-gray-800">{service.pickup_address ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Destino</p>
              <p className="text-gray-800">{service.destination_address ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Conductor</p>
              <p className="text-gray-800">{service.drivers?.name ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Estado</p>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[service.status]}`}>
                {statusLabels[service.status]}
              </span>
            </div>
          </div>

          <hr />

          {/* Timeline de tiempos */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Tiempos del servicio</p>
            <div className="space-y-3">
              {steps.map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-3 h-3 rounded-full mt-0.5 ${step.time ? step.color : 'bg-gray-200'}`} />
                    {i < steps.length - 1 && (
                      <div className={`w-0.5 h-8 mt-1 ${step.time ? 'bg-gray-200' : 'bg-gray-100'}`} />
                    )}
                  </div>
                  <div className="flex-1 pb-1">
                    <div className="flex items-center justify-between">
                      <p className={`text-sm font-medium ${step.time ? 'text-gray-800' : 'text-gray-300'}`}>
                        {step.label}
                      </p>
                      <p className={`text-xs tabular-nums ${step.time ? 'text-gray-500' : 'text-gray-300'}`}>
                        {fmtTime(step.time)}
                      </p>
                    </div>
                    {step.diffLabel && step.diff !== '—' && (
                      <p className="text-xs text-orange-600 font-medium mt-0.5">
                        ⏱ {step.diffLabel}: <span className="font-bold">{step.diff}</span>
                      </p>
                    )}
                    {step.diffLabel && step.diff === '—' && step.time === null && (
                      <p className="text-xs text-gray-300 mt-0.5">Pendiente</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {service.completed_at && (
            <div className="bg-gray-50 rounded-xl px-4 py-3 flex items-center justify-between">
              <p className="text-sm font-medium text-gray-600">Tiempo total del servicio</p>
              <p className="text-sm font-bold text-gray-800">{totalTime}</p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t">
          <button
            onClick={onClose}
            className="w-full bg-gray-100 text-gray-700 py-2 rounded-xl text-sm font-medium hover:bg-gray-200"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ServicesPage() {
  const [services, setServices] = useState<ServiceRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [selected, setSelected] = useState<ServiceRequest | null>(null)
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
      {selected && <ServiceDetailModal service={selected} onClose={() => setSelected(null)} />}

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
                <th className="text-left px-6 py-3 text-gray-600 font-medium">Acciones</th>
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
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setSelected(s)}
                        className="text-blue-500 hover:text-blue-700 text-xs font-medium"
                      >
                        Ver detalles
                      </button>
                      {['pending', 'assigned'].includes(s.status) && (
                        <button
                          onClick={() => cancelService(s.id)}
                          className="text-red-500 hover:text-red-700 text-xs"
                        >
                          Cancelar
                        </button>
                      )}
                    </div>
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
