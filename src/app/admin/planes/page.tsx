'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { RecurringService, RecurringServiceException, Driver } from '@/lib/supabase/types'

const DAY_LABELS = ['D', 'L', 'M', 'X', 'J', 'V', 'S']

function fmtTime(t: string) { return t.slice(0, 5) }
function todayStr() { return new Date().toISOString().split('T')[0] }

type View = 'today' | 'all'

export default function PlanesAdminPage() {
  const [view, setView] = useState<View>('today')
  const [plans, setPlans] = useState<RecurringService[]>([])
  const [exceptions, setExceptions] = useState<RecurringServiceException[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const supabase = createClient()

  async function loadData() {
    setLoading(true)
    const [{ data: plansData }, { data: driversData }] = await Promise.all([
      supabase
        .from('recurring_services')
        .select('*, zones(name), motorcycle_types(name), drivers(name)')
        .order('scheduled_time', { ascending: true }),
      supabase.from('drivers').select('*').order('name'),
    ])

    setPlans(plansData ?? [])
    setDrivers(driversData ?? [])

    if (plansData && plansData.length > 0) {
      const { data: excs } = await supabase
        .from('recurring_service_exceptions')
        .select('*')
        .in('recurring_service_id', plansData.map((p: RecurringService) => p.id))
        .eq('exception_date', todayStr())
      setExceptions(excs ?? [])
    }
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  async function assignDriver(planId: string, driverId: string) {
    setSaving(planId)
    await supabase
      .from('recurring_services')
      .update({ driver_id: driverId || null })
      .eq('id', planId)
    setSaving(null)
    loadData()
  }

  async function toggleActive(plan: RecurringService) {
    await supabase
      .from('recurring_services')
      .update({ is_active: !plan.is_active })
      .eq('id', plan.id)
    loadData()
  }

  const todayDow = new Date().getDay()
  const todayPlans = plans.filter(p => p.is_active && p.days_of_week.includes(todayDow))
  const displayPlans = view === 'today' ? todayPlans : plans

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Planes fijos</h2>
          <p className="text-sm text-gray-400 mt-0.5">Recogidas programadas por clientes</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setView('today')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              view === 'today' ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50 border'
            }`}
          >
            Hoy ({todayPlans.length})
          </button>
          <button
            onClick={() => setView('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              view === 'all' ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50 border'
            }`}
          >
            Todos ({plans.filter(p => p.is_active).length})
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-500">Cargando...</p>
      ) : displayPlans.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-10 text-center text-gray-400">
          <p className="text-4xl mb-3">📋</p>
          <p>{view === 'today' ? 'No hay planes programados para hoy.' : 'No hay planes registrados.'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayPlans.map(plan => {
            const isCancelledToday = exceptions.some(e => e.recurring_service_id === plan.id)
            const borderColor = isCancelledToday
              ? 'border-red-300'
              : plan.driver_id
              ? 'border-green-400'
              : 'border-yellow-400'

            return (
              <div key={plan.id} className={`bg-white rounded-xl shadow-sm p-5 border-l-4 ${borderColor}`}>
                <div className="flex gap-4 items-start">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-xl font-bold text-gray-800">{fmtTime(plan.scheduled_time)}</span>
                      <span className="text-sm text-gray-400">
                        {plan.days_of_week.map(d => DAY_LABELS[d]).join(' · ')}
                      </span>
                      {(plan.motorcycle_types as { name: string } | undefined) && (
                        <span className="bg-blue-50 text-blue-600 text-xs px-2 py-0.5 rounded-full">
                          {(plan.motorcycle_types as { name: string }).name}
                        </span>
                      )}
                      {(plan.zones as { name: string } | undefined) && (
                        <span className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full">
                          {(plan.zones as { name: string }).name}
                        </span>
                      )}
                      {!plan.is_active && (
                        <span className="bg-gray-200 text-gray-500 text-xs px-2 py-0.5 rounded-full">Inactivo</span>
                      )}
                      {isCancelledToday && (
                        <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full font-medium">Cancelado hoy</span>
                      )}
                    </div>

                    <p className="font-semibold text-gray-800">{plan.customer_name}</p>
                    <p className="text-xs text-gray-400 mb-2">{plan.customer_phone}</p>

                    <p className="text-sm text-gray-600">
                      <span className="text-gray-400">Recogida: </span>{plan.pickup_address}
                    </p>
                    {plan.destination_address && (
                      <p className="text-sm text-gray-600">
                        <span className="text-gray-400">Destino: </span>{plan.destination_address}
                      </p>
                    )}
                    {plan.fare && (
                      <p className="text-sm font-semibold text-green-600 mt-1">${plan.fare.toFixed(2)}</p>
                    )}
                    {plan.notes && (
                      <p className="text-xs text-gray-400 mt-1 italic">{plan.notes}</p>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <div>
                      <p className="text-xs text-gray-400 mb-1 text-right">Conductor</p>
                      <select
                        value={plan.driver_id ?? ''}
                        onChange={e => void assignDriver(plan.id, e.target.value)}
                        disabled={saving === plan.id}
                        className="border rounded-lg px-2 py-1.5 text-xs min-w-[150px] focus:outline-none focus:ring-1 focus:ring-orange-400"
                      >
                        <option value="">Sin asignar</option>
                        {drivers.map(d => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    </div>
                    <button
                      onClick={() => void toggleActive(plan)}
                      className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                        plan.is_active
                          ? 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          : 'bg-green-100 text-green-600 hover:bg-green-200'
                      }`}
                    >
                      {plan.is_active ? 'Desactivar' : 'Activar'}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="mt-6 p-4 bg-blue-50 rounded-xl text-xs text-blue-600">
        <p className="font-medium mb-1">Leyenda:</p>
        <p>🟢 Verde = conductor asignado · 🟡 Amarillo = sin conductor · 🔴 Rojo = cancelado hoy por el cliente</p>
      </div>
    </div>
  )
}
