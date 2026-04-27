'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MotorcycleType, Zone, ServiceRequest } from '@/lib/supabase/types'

type Step = 'form' | 'waiting' | 'assigned' | 'in_progress' | 'completed'

export default function PedirMoto() {
  const [step, setStep] = useState<Step>('form')
  const [types, setTypes] = useState<MotorcycleType[]>([])
  const [zones, setZones] = useState<Zone[]>([])
  const [form, setForm] = useState({
    customer_name: '',
    customer_phone: '',
    pickup_address: '',
    destination_address: '',
    requested_type_id: '',
    zone_id: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [serviceId, setServiceId] = useState<string | null>(null)
  const [service, setService] = useState<ServiceRequest | null>(null)
  const [fare, setFare] = useState<number | null>(null)
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locationStatus, setLocationStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const supabase = createClient()

  useEffect(() => {
    setLocationStatus('loading')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLocationStatus('ok')
      },
      () => setLocationStatus('error'),
      { enableHighAccuracy: true }
    )
  }, [])

  useEffect(() => {
    async function loadData() {
      const [{ data: typesData }, { data: zonesData }] = await Promise.all([
        supabase.from('motorcycle_types').select('*'),
        supabase.from('zones').select('*').order('name'),
      ])
      setTypes(typesData ?? [])
      setZones(zonesData ?? [])
    }
    loadData()
  }, [])

  // Calcular tarifa cuando cambia la zona
  useEffect(() => {
    if (form.zone_id) {
      const zone = zones.find(z => z.id === form.zone_id)
      setFare(zone?.base_fare ?? null)
    } else {
      setFare(null)
    }
  }, [form.zone_id, zones])

  // Suscripción realtime al estado del servicio
  useEffect(() => {
    if (!serviceId) return

    const channel = supabase
      .channel(`service_${serviceId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'service_requests',
        filter: `id=eq.${serviceId}`,
      }, (payload) => {
        const updated = payload.new as ServiceRequest
        setService(updated)
        if (updated.status === 'assigned') setStep('assigned')
        if (updated.status === 'in_progress') setStep('in_progress')
        if (updated.status === 'completed') setStep('completed')
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [serviceId])

  async function handleSubmit() {
    setSubmitting(true)

    const { data } = await supabase.from('service_requests').insert({
      customer_name: form.customer_name,
      customer_phone: form.customer_phone,
      pickup_address: form.pickup_address,
      destination_address: form.destination_address || null,
      pickup_lat: location?.lat ?? 0,
      pickup_lng: location?.lng ?? 0,
      requested_type_id: form.requested_type_id ? parseInt(form.requested_type_id) : null,
      zone_id: form.zone_id || null,
      fare: fare,
      status: 'pending',
    }).select().single()

    if (data) {
      setServiceId(data.id)
      setStep('waiting')
    }
    setSubmitting(false)
  }

  function reset() {
    setStep('form')
    setServiceId(null)
    setService(null)
    setFare(null)
    setForm({ customer_name: '', customer_phone: '', pickup_address: '', destination_address: '', requested_type_id: '', zone_id: '' })
  }

  return (
    <div className="min-h-screen bg-orange-50 flex items-start justify-center p-4 pt-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🏍️</div>
          <h1 className="text-3xl font-bold text-gray-800">MotoTaxi</h1>
          <p className="text-gray-500 mt-1">Pide tu moto rápido y seguro</p>
        </div>

        {step === 'form' && (
          <form onSubmit={e => { e.preventDefault(); void handleSubmit() }} className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
            {locationStatus === 'loading' && (
              <div className="bg-blue-50 text-blue-600 text-sm rounded-xl px-4 py-2 flex items-center gap-2">
                <span className="animate-spin">⏳</span> Obteniendo tu ubicación GPS...
              </div>
            )}
            {locationStatus === 'ok' && (
              <div className="bg-green-50 text-green-600 text-sm rounded-xl px-4 py-2 flex items-center gap-2">
                📍 Ubicación GPS detectada
              </div>
            )}
            {locationStatus === 'error' && (
              <div className="bg-yellow-50 text-yellow-600 text-sm rounded-xl px-4 py-2">
                ⚠️ No pudimos obtener tu GPS. Describe bien tu dirección de recogida.
              </div>
            )}
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
              <input
                required
                type="tel"
                value={form.customer_phone}
                onChange={e => setForm({ ...form, customer_phone: e.target.value })}
                className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                placeholder="Tu número de contacto"
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
                <button
                  type="button"
                  onClick={() => setForm({ ...form, requested_type_id: '' })}
                  className={`py-3 rounded-xl text-sm border-2 transition-colors ${
                    form.requested_type_id === '' ? 'border-orange-500 bg-orange-50 text-orange-700 font-medium' : 'border-gray-200 text-gray-600'
                  }`}
                >
                  Cualquiera
                </button>
                {types.map(t => (
                  <button
                    type="button"
                    key={t.id}
                    onClick={() => setForm({ ...form, requested_type_id: String(t.id) })}
                    className={`py-3 rounded-xl text-sm border-2 transition-colors ${
                      form.requested_type_id === String(t.id) ? 'border-orange-500 bg-orange-50 text-orange-700 font-medium' : 'border-gray-200 text-gray-600'
                    }`}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>

            {fare !== null && (
              <div className="bg-orange-50 rounded-xl p-3 text-center">
                <p className="text-sm text-gray-600">Tarifa estimada</p>
                <p className="text-2xl font-bold text-orange-500">${fare.toFixed(2)}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-orange-500 text-white py-4 rounded-xl font-bold text-lg hover:bg-orange-600 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Enviando...' : 'Pedir moto ahora'}
            </button>
          </form>
        )}

        {step === 'waiting' && (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <div className="text-5xl mb-4 animate-bounce">🔍</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Buscando conductor...</h2>
            <p className="text-gray-500 text-sm">Estamos buscando el conductor más cercano a ti. Un momento.</p>
            <div className="mt-6 flex justify-center gap-2">
              <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
              <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
            </div>
          </div>
        )}

        {step === 'assigned' && service && (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <div className="text-5xl mb-4">🏍️</div>
            <h2 className="text-xl font-bold text-gray-800 mb-1">¡Conductor en camino!</h2>
            <p className="text-gray-500 text-sm mb-4">Tu moto ya fue asignada y está yendo hacia ti.</p>
            {service.fare && (
              <p className="text-2xl font-bold text-orange-500 mb-2">${service.fare.toFixed(2)}</p>
            )}
            <p className="text-xs text-gray-400">Espera en tu punto de recogida</p>
          </div>
        )}

        {step === 'in_progress' && (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <div className="text-5xl mb-4">🛵</div>
            <h2 className="text-xl font-bold text-gray-800 mb-1">¡Viaje en curso!</h2>
            <p className="text-gray-500 text-sm">Estás siendo llevado a tu destino.</p>
          </div>
        )}

        {step === 'completed' && (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-xl font-bold text-gray-800 mb-1">¡Viaje completado!</h2>
            <p className="text-gray-500 text-sm mb-6">Gracias por usar MotoTaxi.</p>
            <button
              onClick={reset}
              className="bg-orange-500 text-white px-8 py-3 rounded-xl font-medium hover:bg-orange-600"
            >
              Pedir otra moto
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
