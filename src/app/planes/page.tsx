'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { RecurringService, RecurringServiceException, MotorcycleType, Zone } from '@/lib/supabase/types'

const DAY_LABELS = ['D', 'L', 'M', 'X', 'J', 'V', 'S']
const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

function fmtTime(t: string) { return t.slice(0, 5) }
function fmtDate(d: Date) { return d.toISOString().split('T')[0] }

function getUpcomingDates(daysOfWeek: number[], count = 10): Date[] {
  const dates: Date[] = []
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  while (dates.length < count) {
    if (daysOfWeek.includes(d.getDay())) dates.push(new Date(d))
    d.setDate(d.getDate() + 1)
  }
  return dates
}

type Step = 'phone' | 'plans' | 'new_plan'

export default function PlanesPage() {
  const [step, setStep] = useState<Step>('phone')
  const [phone, setPhone] = useState('')
  const [plans, setPlans] = useState<RecurringService[]>([])
  const [exceptions, setExceptions] = useState<RecurringServiceException[]>([])
  const [types, setTypes] = useState<MotorcycleType[]>([])
  const [zones, setZones] = useState<Zone[]>([])
  const [loading, setLoading] = useState(false)
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null)
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [form, setForm] = useState({
    customer_name: '',
    pickup_address: '',
    destination_address: '',
    zone_id: '',
    requested_type_id: '',
    scheduled_time: '08:00',
    days_of_week: [1, 2, 3, 4, 5] as number[],
    notes: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      pos => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true }
    )
    async function loadMeta() {
      const [{ data: t }, { data: z }] = await Promise.all([
        supabase.from('motorcycle_types').select('*'),
        supabase.from('zones').select('*').order('name'),
      ])
      setTypes(t ?? [])
      setZones(z ?? [])
    }
    loadMeta()
  }, [])

  async function lookupPhone() {
    setLoading(true)
    const { data } = await supabase
      .from('recurring_services')
      .select('*, zones(name), motorcycle_types(name), drivers(name)')
      .eq('customer_phone', phone.trim())
      .eq('is_active', true)
      .order('scheduled_time', { ascending: true })

    setPlans(data ?? [])
    if (data && data.length > 0) {
      setForm(f => ({ ...f, customer_name: data[0].customer_name }))
      const ids = data.map((p: RecurringService) => p.id)
      const { data: excs } = await supabase
        .from('recurring_service_exceptions')
        .select('*')
        .in('recurring_service_id', ids)
        .gte('exception_date', fmtDate(new Date()))
      setExceptions(excs ?? [])
    }
    setLoading(false)
    setStep('plans')
  }

  async function toggleException(planId: string, date: Date) {
    const dateStr = fmtDate(date)
    const existing = exceptions.find(e => e.recurring_service_id === planId && e.exception_date === dateStr)
    if (existing) {
      await supabase.from('recurring_service_exceptions').delete().eq('id', existing.id)
      setExceptions(prev => prev.filter(e => e.id !== existing.id))
    } else {
      const { data } = await supabase.from('recurring_service_exceptions').insert({
        recurring_service_id: planId,
        exception_date: dateStr,
        reason: 'Cancelado por cliente',
      }).select().single()
      if (data) setExceptions(prev => [...prev, data])
    }
  }

  async function createPlan() {
    setSubmitting(true)
    const fare = zones.find(z => z.id === form.zone_id)?.base_fare ?? null
    await supabase.from('recurring_services').insert({
      customer_name: form.customer_name || 'Cliente',
      customer_phone: phone,
      pickup_address: form.pickup_address,
      pickup_lat: location?.lat ?? 0,
      pickup_lng: location?.lng ?? 0,
      destination_address: form.destination_address || null,
      zone_id: form.zone_id || null,
      requested_type_id: form.requested_type_id ? parseInt(form.requested_type_id) : null,
      fare,
      scheduled_time: form.scheduled_time,
      days_of_week: form.days_of_week,
      notes: form.notes || null,
    })
    setSubmitting(false)
    await lookupPhone()
  }

  function toggleDay(day: number) {
    setForm(f => ({
      ...f,
      days_of_week: f.days_of_week.includes(day)
        ? f.days_of_week.filter(d => d !== day)
        : [...f.days_of_week, day].sort(),
    }))
  }

  if (step === 'phone') {
    return (
      <div className="min-h-screen bg-orange-50 flex items-start justify-center p-4 pt-10">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="text-5xl mb-3">🔄</div>
            <h1 className="text-3xl font-bold text-gray-800">Mis planes fijos</h1>
            <p className="text-gray-500 mt-1">Gestiona tus recogidas programadas</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tu número de teléfono</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && phone.trim() && void lookupPhone()}
                className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                placeholder="Ej: 0991234567"
              />
            </div>
            <button
              onClick={() => void lookupPhone()}
              disabled={loading || !phone.trim()}
              className="w-full bg-orange-500 text-white py-3 rounded-xl font-medium hover:bg-orange-600 disabled:opacity-50"
            >
              {loading ? 'Buscando...' : 'Ver mis planes'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'new_plan') {
    return (
      <div className="min-h-screen bg-orange-50 flex items-start justify-center p-4 pt-6">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => setStep('plans')} className="text-orange-500 hover:text-orange-600 font-medium">← Volver</button>
            <h2 className="text-xl font-bold text-gray-800">Nuevo plan fijo</h2>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tu nombre</label>
              <input
                required
                value={form.customer_name}
                onChange={e => setForm({ ...form, customer_name: e.target.value })}
                className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                placeholder="¿Cómo te llamas?"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">¿Dónde te recogemos?</label>
              <input
                required
                value={form.pickup_address}
                onChange={e => setForm({ ...form, pickup_address: e.target.value })}
                className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                placeholder="Dirección o referencia"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">¿A dónde vas? (opcional)</label>
              <input
                value={form.destination_address}
                onChange={e => setForm({ ...form, destination_address: e.target.value })}
                className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                placeholder="Destino"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Zona</label>
              <select
                required
                value={form.zone_id}
                onChange={e => setForm({ ...form, zone_id: e.target.value })}
                className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              >
                <option value="">Selecciona tu zona</option>
                {zones.map(z => (
                  <option key={z.id} value={z.id}>{z.name} — ${z.base_fare.toFixed(2)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de moto</label>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setForm({ ...form, requested_type_id: '' })}
                  className={`py-2.5 rounded-xl text-sm border-2 transition-colors ${form.requested_type_id === '' ? 'border-orange-500 bg-orange-50 text-orange-700 font-medium' : 'border-gray-200 text-gray-600'}`}>
                  Cualquiera
                </button>
                {types.map(t => (
                  <button type="button" key={t.id} onClick={() => setForm({ ...form, requested_type_id: String(t.id) })}
                    className={`py-2.5 rounded-xl text-sm border-2 transition-colors ${form.requested_type_id === String(t.id) ? 'border-orange-500 bg-orange-50 text-orange-700 font-medium' : 'border-gray-200 text-gray-600'}`}>
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hora de recogida</label>
              <input
                type="time"
                required
                value={form.scheduled_time}
                onChange={e => setForm({ ...form, scheduled_time: e.target.value })}
                className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Días de recogida</label>
              <div className="flex gap-1.5">
                {DAY_LABELS.map((label, i) => (
                  <button
                    type="button"
                    key={i}
                    onClick={() => toggleDay(i)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium border-2 transition-colors ${
                      form.days_of_week.includes(i)
                        ? 'border-orange-500 bg-orange-50 text-orange-700'
                        : 'border-gray-200 text-gray-500'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notas (opcional)</label>
              <input
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                placeholder="Ej: esperar en la entrada principal"
              />
            </div>
            <button
              onClick={() => void createPlan()}
              disabled={submitting || !form.pickup_address || !form.zone_id || form.days_of_week.length === 0 || !form.customer_name}
              className="w-full bg-orange-500 text-white py-4 rounded-xl font-bold text-lg hover:bg-orange-600 disabled:opacity-50"
            >
              {submitting ? 'Guardando...' : 'Crear plan'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-orange-50 flex items-start justify-center p-4 pt-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🔄</div>
          <h1 className="text-2xl font-bold text-gray-800">Mis planes fijos</h1>
          <p className="text-gray-400 text-sm">{phone}</p>
        </div>

        {plans.length === 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-400 mb-4">
            <p className="text-3xl mb-2">📋</p>
            <p className="text-sm">No tienes planes registrados aún.</p>
          </div>
        )}

        <div className="space-y-4 mb-4">
          {plans.map(plan => {
            const upcoming = getUpcomingDates(plan.days_of_week, 10)
            const isExpanded = expandedPlan === plan.id
            const planExceptions = exceptions.filter(e => e.recurring_service_id === plan.id)

            return (
              <div key={plan.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="p-5">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-2xl font-bold text-gray-800">{fmtTime(plan.scheduled_time)}</p>
                      <p className="text-sm text-orange-500 font-medium mt-0.5">
                        {plan.days_of_week.map(d => DAY_LABELS[d]).join(' · ')}
                      </p>
                    </div>
                    {plan.fare && (
                      <span className="text-green-600 font-bold text-lg">${plan.fare.toFixed(2)}</span>
                    )}
                  </div>
                  <div className="space-y-1 text-sm mb-3">
                    <div>
                      <p className="text-xs text-gray-400">Recogida</p>
                      <p className="text-gray-700">{plan.pickup_address}</p>
                    </div>
                    {plan.destination_address && (
                      <div>
                        <p className="text-xs text-gray-400 mt-1">Destino</p>
                        <p className="text-gray-700">{plan.destination_address}</p>
                      </div>
                    )}
                  </div>
                  {plan.drivers && (
                    <p className="text-xs text-gray-500 mb-3">
                      Conductor asignado: <span className="font-medium text-gray-700">{(plan.drivers as { name: string }).name}</span>
                    </p>
                  )}
                  <button
                    onClick={() => setExpandedPlan(isExpanded ? null : plan.id)}
                    className="text-sm text-orange-500 hover:text-orange-600 font-medium"
                  >
                    {isExpanded ? 'Ocultar días' : 'Cancelar un día específico →'}
                  </button>
                </div>

                {isExpanded && (
                  <div className="border-t px-5 py-4 bg-gray-50">
                    <p className="text-xs font-medium text-gray-500 mb-3">Toca una fecha para cancelar o reactivar:</p>
                    <div className="space-y-2">
                      {upcoming.map(date => {
                        const dateStr = fmtDate(date)
                        const isCancelled = planExceptions.some(e => e.exception_date === dateStr)
                        const isToday = fmtDate(new Date()) === dateStr
                        return (
                          <button
                            key={dateStr}
                            onClick={() => void toggleException(plan.id, date)}
                            className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl border-2 text-sm transition-colors ${
                              isCancelled
                                ? 'border-red-200 bg-red-50 text-red-600'
                                : 'border-gray-200 bg-white text-gray-700 hover:border-orange-300'
                            }`}
                          >
                            <span>
                              {DAY_NAMES[date.getDay()]}{' '}
                              {date.toLocaleDateString('es', { day: 'numeric', month: 'short' })}
                              {isToday && <span className="ml-2 text-xs text-orange-500 font-medium">Hoy</span>}
                            </span>
                            <span className={`text-xs font-semibold ${isCancelled ? 'text-red-500' : 'text-green-500'}`}>
                              {isCancelled ? 'Cancelado ✕' : 'Activo ✓'}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <button
          onClick={() => setStep('new_plan')}
          className="w-full bg-orange-500 text-white py-4 rounded-2xl font-bold text-lg hover:bg-orange-600"
        >
          + Agregar nuevo plan
        </button>
        <button
          onClick={() => { setStep('phone'); setPlans([]); setPhone('') }}
          className="w-full mt-3 text-gray-400 text-sm py-2 hover:text-gray-600"
        >
          Cambiar número
        </button>
      </div>
    </div>
  )
}
