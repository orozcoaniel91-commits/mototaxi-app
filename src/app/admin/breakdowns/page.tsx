'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BreakdownReport } from '@/lib/supabase/types'

const statusColors: Record<string, string> = {
  reported: 'bg-red-100 text-red-700',
  in_repair: 'bg-yellow-100 text-yellow-700',
  resolved: 'bg-green-100 text-green-700',
}

const statusLabels: Record<string, string> = {
  reported: 'Reportada',
  in_repair: 'En reparación',
  resolved: 'Resuelta',
}

export default function BreakdownsPage() {
  const [breakdowns, setBreakdowns] = useState<BreakdownReport[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  async function loadBreakdowns() {
    const { data } = await supabase
      .from('breakdown_reports')
      .select('*, drivers(name, phone), motorcycles(plate, brand, model)')
      .order('reported_at', { ascending: false })
    setBreakdowns(data ?? [])
    setLoading(false)
  }

  useEffect(() => { loadBreakdowns() }, [])

  async function updateStatus(id: string, status: string) {
    const update: Record<string, unknown> = { status }
    if (status === 'resolved') update.resolved_at = new Date().toISOString()

    await supabase.from('breakdown_reports').update(update).eq('id', id)

    if (status === 'resolved') {
      const breakdown = breakdowns.find(b => b.id === id)
      if (breakdown) {
        await Promise.all([
          supabase.from('drivers').update({ status: 'available' }).eq('id', breakdown.driver_id),
          supabase.from('motorcycles').update({ status: 'active' }).eq('id', breakdown.motorcycle_id),
        ])
      }
    }

    loadBreakdowns()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Averías</h2>
        <span className="text-sm text-gray-500">
          {breakdowns.filter(b => b.status !== 'resolved').length} averías activas
        </span>
      </div>

      {loading ? (
        <p className="text-gray-500">Cargando...</p>
      ) : (
        <div className="space-y-4">
          {breakdowns.length === 0 && (
            <div className="bg-white rounded-xl shadow-sm p-8 text-center text-gray-400">No hay averías registradas</div>
          )}
          {breakdowns.map(b => (
            <div key={b.id} className="bg-white rounded-xl shadow-sm p-5 flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[b.status]}`}>
                    {statusLabels[b.status]}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(b.reported_at).toLocaleString('es')}
                  </span>
                </div>
                <p className="font-medium text-gray-800">{b.drivers?.name ?? '—'}</p>
                <p className="text-sm text-gray-500">
                  Moto: {[b.motorcycles?.brand, b.motorcycles?.model, b.motorcycles?.plate].filter(Boolean).join(' ')}
                </p>
                {b.description && (
                  <p className="text-sm text-gray-600 mt-1 italic">"{b.description}"</p>
                )}
                {b.location_lat && b.location_lng && (
                  <a
                    href={`https://www.google.com/maps?q=${b.location_lat},${b.location_lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-blue-500 hover:underline mt-1 inline-block"
                  >
                    Ver ubicación en mapa
                  </a>
                )}
              </div>
              <div className="flex flex-col gap-2">
                {b.status === 'reported' && (
                  <button
                    onClick={() => updateStatus(b.id, 'in_repair')}
                    className="bg-yellow-500 text-white px-3 py-1 rounded-lg text-xs hover:bg-yellow-600"
                  >
                    En reparación
                  </button>
                )}
                {b.status !== 'resolved' && (
                  <button
                    onClick={() => updateStatus(b.id, 'resolved')}
                    className="bg-green-500 text-white px-3 py-1 rounded-lg text-xs hover:bg-green-600"
                  >
                    Resolver
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
