'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { MotorcycleType, Zone, ServiceRequest } from '@/lib/supabase/types'

type Step = 'form' | 'waiting' | 'assigned' | 'in_progress' | 'completed'

interface PastRoute {
  pickup_address: string
  destination_address: string | null
  zone_id: string | null
  requested_type_id: number | null
  fare: number | null
  count: number
}

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

  // Lookup de cliente por teléfono
  const [lookingUp, setLookingUp] = useState(false)
  const [pastRoutes, setPastRoutes] = useState<PastRoute[]>([])
  const [selectedRoute, setSelectedRoute] = useState<PastRoute | null>(null)
  const [manualMode, setManualMode] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    setLocationStatus('loading')
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocationStatus('ok') },
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

  // Buscar cliente cuando el teléfono tiene suficientes dígitos
  useEffect(() => {
    const phone = form.customer_phone.trim()
    if (phone.length < 7) {
      setPastRoutes([])
      return
    }
    const timer = setTimeout(async () => {
      setLookingUp(true)
      const { data } = await supabase
        .from('service_requests')
        .select('customer_name, pickup_address, destination_address, zone_id, requested_type_id, fare')
        .eq('customer_phone', phone)
        .in('status', ['completed', 'assigned', 'in_progress'])
        .order('requested_at', { ascending: false })
        .limit(30)

      if (data && data.length > 0) {
        // Auto-rellenar nombre
        setForm(f => ({ ...f, customer_name: f.customer_name || data[0].customer_name }))

        // Deduplicar rutas por pickup+destination
        const seen = new Set<string>()
        const routes: PastRoute[] = []
        for (const trip of data) {
          const key = `${trip.pickup_address ?? ''}|${trip.destination_address ?? ''}`
          if (!seen.has(key)) {
            seen.add(key)
            routes.push({
              pickup_address: trip.pickup_address ?? '',
              destination_address: trip.destination_address,
              zone_id: trip.zone_id,
              requested_type_id: trip.requested_type_id,
              fare: trip.fare,
              count: data.filter(t =>
                t.pickup_address === trip.pickup_address &&
                t.destination_address === trip.destination_address
              ).length,
            })
          }
        }
        setPastRoutes(routes.slice(0, 5))
      } else {
        setPastRoutes([])
      }
      setLookingUp(false)
    }, 600)
    return () => clearTimeout(timer)
  }, [form.customer_phone])

  // Calcular tarifa cuando cambia la zona
  useEffect(() => {
    if (form.zone_id) {
      const zone = zones.find(z => z.id === form.zone_id)
      setFare(zone?.base_fare ?? null)
    } else {
      setFare(null)
    }
  }, [form.zone_id, zones])

  useEffect(() => {
    if (!serviceId) return
    const channel = supabase
      .channel(`service_${serviceId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'service_requests', filter: `id=eq.${serviceId}` }, (payload) => {
        const updated = payload.new as ServiceRequest
        setService(updated)
        if (updated.status === 'assigned') setStep('assigned')
        if (updated.status === 'in_progress') setStep('in_progress')
        if (updated.status === 'completed') setStep('completed')
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [serviceId])

  function selectRoute(route: PastRoute) {
    setSelectedRoute(route)
    setManualMode(false)
    setForm(f => ({
      ...f,
      pickup_address: route.pickup_address,
      destination_address: route.destination_address ?? '',
      zone_id: route.zone_id ?? '',
      requested_type_id: route.requested_type_id ? String(route.requested_type_id) : '',
    }))
  }

  function clearRoute() {
    setSelectedRoute(null)
    setManualMode(true)
    setForm(f => ({ ...f, pickup_address: '', destination_address: '', zone_id: '', requested_type_id: '' }))
  }

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
    if (data) { setServiceId(data.id); setStep('waiting') }
    setSubmitting(false)
  }

  async function cancelService() {
    if (!serviceId) return
    await supabase.from('service_requests').update({ status: 'cancelled' }).eq('id', serviceId)
    if (service?.driver_id) {
      await supabase.from('drivers').update({ status: 'available' }).eq('id', service.driver_id)
    }
    reset()
  }

  function reset() {
    setStep('form')
    setServiceId(null)
    setService(null)
    setFare(null)
    setPastRoutes([])
    setSelectedRoute(null)
    setManualMode(false)
    setForm({ customer_name: '', customer_phone: '', pickup_address: '', destination_address: '', requested_type_id: '', zone_id: '' })
  }

  const zoneName = (id: string) => zones.find(z => z.id === id)?.name ?? ''
  const showRoutes = pastRoutes.length > 0 && !selectedRoute && !manualMode
  const needsFullForm = selectedRoute !== null || manualMode || pastRoutes.length === 0

  return (
    <div className="min-h-screen bg-orange-50 flex items-start justify-center p-4 pt-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🏍️</div>
          <h1 className="text-3xl font-bold text-gray-800">MotoTaxi</h1>
          <p className="text-gray-500 mt-1">Pide tu moto rápido y seguro</p>
          <Link href="/" className="inline-block mt-3 text-xs text-gray-400 hover:text-gray-600">← Inicio</Link>
        </div>

        {step === 'form' && (
          <form onSubmit={e => { e.preventDefault(); void handleSubmit() }} className="space-y-4">
            {/* Teléfono — siempre primero */}
            <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Tu teléfono</label>
                <div className="relative">
                  <input
                    required
                    type="tel"
                    value={form.customer_phone}
                    onChange={e => { setForm({ ...form, customer_phone: e.target.value }); setSelectedRoute(null); setManualMode(false) }}
                    className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 pr-10"
                    placeholder="Tu número de contacto"
                  />
                  {lookingUp && (
                    <span className="absolute right-3 top-3.5 text-gray-400 text-xs animate-pulse">Buscando...</span>
                  )}
                  {!lookingUp && pastRoutes.length > 0 && (
                    <span className="absolute right-3 top-3 text-green-500 text-lg">✓</span>
                  )}
                </div>
              </div>

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
            </div>

            {/* Rutas anteriores */}
            {showRoutes && (
              <div className="bg-white rounded-2xl shadow-sm p-5">
                <p className="text-sm font-semibold text-gray-700 mb-3">¡Bienvenido de nuevo! ¿A dónde vas hoy?</p>
                <div className="space-y-2">
                  {pastRoutes.map((route, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => selectRoute(route)}
                      className="w-full text-left bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-xl px-4 py-3 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">📍 {route.pickup_address}</p>
                          {route.destination_address && (
                            <p className="text-xs text-gray-500 truncate mt-0.5">🏁 {route.destination_address}</p>
                          )}
                          {route.zone_id && (
                            <p className="text-xs text-gray-400 mt-0.5">{zoneName(route.zone_id)}</p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          {route.fare != null && (
                            <p className="text-sm font-bold text-orange-500">${route.fare.toFixed(2)}</p>
                          )}
                          {route.count > 1 && (
                            <p className="text-xs text-gray-400">{route.count}x</p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setManualMode(true)}
                    className="w-full text-center text-sm text-gray-500 hover:text-orange-500 py-2 border border-dashed border-gray-300 rounded-xl transition-colors"
                  >
                    + Nuevo destino
                  </button>
                </div>
              </div>
            )}

            {/* Ruta seleccionada o formulario manual */}
            {selectedRoute && (
              <div className="bg-white rounded-2xl shadow-sm p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-gray-700">Ruta seleccionada</p>
                  <button type="button" onClick={clearRoute} className="text-xs text-gray-400 hover:text-orange-500">Cambiar</button>
                </div>
                <div className="bg-orange-50 rounded-xl px-4 py-3 space-y-1">
                  <p className="text-sm font-medium text-gray-800">📍 {selectedRoute.pickup_address}</p>
                  {selectedRoute.destination_address && (
                    <p className="text-sm text-gray-600">🏁 {selectedRoute.destination_address}</p>
                  )}
                  {selectedRoute.zone_id && (
                    <p className="text-xs text-gray-400">{zoneName(selectedRoute.zone_id)}</p>
                  )}
                </div>

                {/* Permitir cambiar destino si quiere */}
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">¿Cambiar destino? (opcional)</label>
                  <input
                    value={form.destination_address}
                    onChange={e => setForm({ ...form, destination_address: e.target.value })}
                    className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                    placeholder="Deja vacío para usar el mismo destino"
                  />
                </div>
              </div>
            )}

            {/* Formulario completo para nuevo destino */}
            {needsFullForm && !selectedRoute && (
              <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
                {manualMode && (
                  <button type="button" onClick={() => setManualMode(false)} className="text-xs text-gray-400 hover:text-orange-500">
                    ← Volver a rutas anteriores
                  </button>
                )}
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
                      className={`py-3 rounded-xl text-sm border-2 transition-colors ${form.requested_type_id === '' ? 'border-orange-500 bg-orange-50 text-orange-700 font-medium' : 'border-gray-200 text-gray-600'}`}>
                      Cualquiera
                    </button>
                    {types.map(t => (
                      <button type="button" key={t.id} onClick={() => setForm({ ...form, requested_type_id: String(t.id) })}
                        className={`py-3 rounded-xl text-sm border-2 transition-colors ${form.requested_type_id === String(t.id) ? 'border-orange-500 bg-orange-50 text-orange-700 font-medium' : 'border-gray-200 text-gray-600'}`}>
                        {t.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Zona para ruta seleccionada si no tiene zona guardada */}
            {selectedRoute && !selectedRoute.zone_id && (
              <div className="bg-white rounded-2xl shadow-sm p-5">
                <label className="block text-sm font-medium text-gray-700 mb-1">Zona</label>
                <select required value={form.zone_id} onChange={e => setForm({ ...form, zone_id: e.target.value })}
                  className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                  <option value="">Selecciona tu zona</option>
                  {zones.map(z => <option key={z.id} value={z.id}>{z.name} — ${z.base_fare.toFixed(2)}</option>)}
                </select>
              </div>
            )}

            {/* Tarifa y botón — solo si hay pickup */}
            {(selectedRoute || manualMode || (pastRoutes.length === 0 && form.customer_phone.length >= 7)) && (
              <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
                {fare !== null && (
                  <div className="bg-orange-50 rounded-xl p-3 text-center">
                    <p className="text-sm text-gray-600">Tarifa estimada</p>
                    <p className="text-2xl font-bold text-orange-500">${fare.toFixed(2)}</p>
                  </div>
                )}
                <button type="submit" disabled={submitting}
                  className="w-full bg-orange-500 text-white py-4 rounded-xl font-bold text-lg hover:bg-orange-600 disabled:opacity-50 transition-colors">
                  {submitting ? 'Enviando...' : 'Pedir moto ahora'}
                </button>
              </div>
            )}
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
            <button onClick={() => void cancelService()}
              className="mt-8 w-full border border-red-200 text-red-500 py-3 rounded-xl text-sm font-medium hover:bg-red-50 transition-colors">
              Cancelar pedido
            </button>
          </div>
        )}

        {step === 'assigned' && service && (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <div className="text-5xl mb-4">🏍️</div>
            <h2 className="text-xl font-bold text-gray-800 mb-1">¡Conductor en camino!</h2>
            <p className="text-gray-500 text-sm mb-4">Tu moto ya fue asignada y está yendo hacia ti.</p>
            {service.fare && <p className="text-2xl font-bold text-orange-500 mb-2">${service.fare.toFixed(2)}</p>}
            <p className="text-xs text-gray-400 mb-6">Espera en tu punto de recogida</p>
            <button onClick={() => void cancelService()}
              className="w-full border border-red-200 text-red-500 py-3 rounded-xl text-sm font-medium hover:bg-red-50 transition-colors">
              Cancelar pedido
            </button>
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
            <button onClick={reset} className="bg-orange-500 text-white px-8 py-3 rounded-xl font-medium hover:bg-orange-600">
              Pedir otra moto
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
