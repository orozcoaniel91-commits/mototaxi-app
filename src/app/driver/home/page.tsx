'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Driver, ServiceRequest } from '@/lib/supabase/types'

type ActiveService = ServiceRequest & { drivers?: Driver }

export default function DriverHome() {
  const [driver, setDriver] = useState<Driver | null>(null)
  const [pendingServices, setPendingServices] = useState<ServiceRequest[]>([])
  const [activeService, setActiveService] = useState<ActiveService | null>(null)
  const [showBreakdownForm, setShowBreakdownForm] = useState(false)
  const [breakdownDesc, setBreakdownDesc] = useState('')
  const [locationError, setLocationError] = useState('')
  const [driverZoneId, setDriverZoneId] = useState<string | null>(null)
  const [driverMotoTypeId, setDriverMotoTypeId] = useState<number | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const [driverId, setDriverId] = useState<string | null>(null)

  useEffect(() => {
    const id = localStorage.getItem('driver_id')
    if (!id) { router.push('/driver'); return }
    setDriverId(id)
  }, [])

  // Cargar datos del conductor
  useEffect(() => {
    if (!driverId) return

    async function loadDriver() {
      const { data } = await supabase.from('drivers').select('*').eq('id', driverId).single()
      if (!data) { router.push('/driver'); return }
      setDriver(data)
      setDriverZoneId(data.zone_id)

      const { data: assignment } = await supabase
        .from('driver_motorcycle_assignments')
        .select('motorcycle_id')
        .eq('driver_id', driverId)
        .eq('is_active', true)
        .single()

      if (assignment?.motorcycle_id) {
        const { data: moto } = await supabase
          .from('motorcycles')
          .select('motorcycle_type_id')
          .eq('id', assignment.motorcycle_id)
          .single()
        setDriverMotoTypeId(moto?.motorcycle_type_id ?? null)
      }
    }
    loadDriver()
  }, [driverId])

  // Cargar servicio activo
  const loadActiveService = useCallback(async () => {
    if (!driverId) return
    const { data } = await supabase
      .from('service_requests')
      .select('*')
      .eq('driver_id', driverId)
      .in('status', ['assigned', 'in_progress'])
      .single()
    setActiveService(data)
  }, [driverId])

  // Cargar servicios pendientes filtrados por zona y tipo de moto del conductor
  const loadPendingServices = useCallback(async () => {
    if (!driverId) return

    let query = supabase
      .from('service_requests')
      .select('*, motorcycle_types(name)')
      .eq('status', 'pending')
      .order('requested_at', { ascending: true })
      .limit(5)

    // Si el conductor tiene zona asignada, solo ve servicios de ESA zona exacta
    // Si no tiene zona, ve todos los servicios
    if (driverZoneId) {
      query = query.eq('zone_id', driverZoneId)
    }

    // Si el conductor tiene tipo de moto, ve servicios de ese tipo + "cualquiera"
    // Si no tiene tipo asignado, solo ve servicios sin tipo específico
    if (driverMotoTypeId !== null) {
      query = query.or(`requested_type_id.is.null,requested_type_id.eq.${driverMotoTypeId}`)
    } else {
      query = query.is('requested_type_id', null)
    }

    const { data } = await query
    setPendingServices(data ?? [])
  }, [driverId, driverZoneId, driverMotoTypeId])

  useEffect(() => {
    loadActiveService()
    loadPendingServices()
  }, [loadActiveService, loadPendingServices])

  // Suscripción realtime a servicios pendientes
  useEffect(() => {
    const channel = supabase
      .channel('pending_services')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'service_requests',
      }, () => {
        loadPendingServices()
        loadActiveService()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [loadPendingServices, loadActiveService])

  // Compartir ubicación en tiempo real
  useEffect(() => {
    if (!driverId || !driver || driver.status === 'offline') return

    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords
        await supabase.from('drivers').update({
          current_lat: lat,
          current_lng: lng,
          last_location_update: new Date().toISOString(),
        }).eq('id', driverId)
        setLocationError('')
      },
      () => setLocationError('No se pudo obtener tu ubicación. Activa el GPS.'),
      { enableHighAccuracy: true, maximumAge: 10000 }
    )

    return () => navigator.geolocation.clearWatch(watchId)
  }, [driverId, driver?.status])

  async function toggleStatus() {
    if (!driver || !driverId) return
    const newStatus = driver.status === 'available' ? 'offline' : 'available'
    await supabase.from('drivers').update({ status: newStatus }).eq('id', driverId)
    setDriver({ ...driver, status: newStatus })
    if (newStatus === 'available') {
      loadPendingServices()
    }
  }

  async function acceptService(serviceId: string) {
    if (!driverId) return
    await supabase.from('service_requests').update({
      status: 'assigned',
      driver_id: driverId,
      accepted_at: new Date().toISOString(),
    }).eq('id', serviceId)
    await supabase.from('drivers').update({ status: 'busy' }).eq('id', driverId)
    setDriver(prev => prev ? { ...prev, status: 'busy' } : prev)
    loadActiveService()
    loadPendingServices()
  }

  async function startService() {
    if (!activeService) return
    await supabase.from('service_requests').update({
      status: 'in_progress',
      started_at: new Date().toISOString(),
    }).eq('id', activeService.id)
    setActiveService({ ...activeService, status: 'in_progress' })
  }

  async function completeService() {
    if (!activeService || !driverId) return
    await supabase.from('service_requests').update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    }).eq('id', activeService.id)
    await supabase.from('drivers').update({ status: 'available' }).eq('id', driverId)
    setDriver(prev => prev ? { ...prev, status: 'available' } : prev)
    setActiveService(null)
    loadPendingServices()
  }

  async function reportBreakdown() {
    if (!driverId || !driver) return

    const { data: assignment } = await supabase
      .from('driver_motorcycle_assignments')
      .select('motorcycle_id')
      .eq('driver_id', driverId)
      .eq('is_active', true)
      .single()

    navigator.geolocation.getCurrentPosition(async (pos) => {
      await supabase.from('breakdown_reports').insert({
        driver_id: driverId,
        motorcycle_id: assignment?.motorcycle_id ?? null,
        service_request_id: activeService?.id ?? null,
        description: breakdownDesc,
        location_lat: pos.coords.latitude,
        location_lng: pos.coords.longitude,
        status: 'reported',
      })

      await supabase.from('drivers').update({ status: 'breakdown' }).eq('id', driverId)
      if (assignment?.motorcycle_id) {
        await supabase.from('motorcycles').update({ status: 'breakdown' }).eq('id', assignment.motorcycle_id)
      }

      setDriver(prev => prev ? { ...prev, status: 'breakdown' } : prev)
      setShowBreakdownForm(false)
      setBreakdownDesc('')
    })
  }

  function logout() {
    localStorage.removeItem('driver_id')
    localStorage.removeItem('driver_name')
    router.push('/driver')
  }

  if (!driver) return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <p className="text-white">Cargando...</p>
    </div>
  )

  const statusConfig = {
    available: { label: 'Disponible', color: 'bg-green-500', dot: 'bg-green-400' },
    busy: { label: 'En servicio', color: 'bg-orange-500', dot: 'bg-orange-400' },
    offline: { label: 'Desconectado', color: 'bg-gray-500', dot: 'bg-gray-400' },
    breakdown: { label: 'Avería', color: 'bg-red-500', dot: 'bg-red-400' },
  }

  const status = statusConfig[driver.status]

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-gray-900 text-white px-4 py-4 flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-400">Bienvenido</p>
          <p className="font-bold">{driver.name}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${status.color}`}>
            <span className={`w-2 h-2 rounded-full ${status.dot} animate-pulse`}></span>
            {status.label}
          </span>
          <button onClick={logout} className="text-gray-400 text-xs hover:text-white">Salir</button>
        </div>
      </div>

      <div className="p-4 space-y-4 max-w-md mx-auto">
        {locationError && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3">
            {locationError}
          </div>
        )}

        {/* Toggle disponibilidad */}
        {driver.status !== 'breakdown' && !activeService && (
          <button
            onClick={toggleStatus}
            className={`w-full py-4 rounded-2xl font-bold text-white text-lg transition-colors ${
              driver.status === 'available' ? 'bg-gray-600 hover:bg-gray-700' : 'bg-green-500 hover:bg-green-600'
            }`}
          >
            {driver.status === 'available' ? 'Desconectarme' : 'Conectarme'}
          </button>
        )}

        {/* Servicio activo */}
        {activeService && (
          <div className="bg-white rounded-2xl shadow-sm p-5 border-l-4 border-orange-500">
            <p className="text-xs font-medium text-orange-500 uppercase mb-2">Servicio activo</p>
            <div className="space-y-2 mb-4">
              <div>
                <p className="text-xs text-gray-400">Cliente</p>
                <p className="font-semibold">{activeService.customer_name}</p>
                <p className="text-sm text-gray-500">{activeService.customer_phone}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Recogida</p>
                <p className="text-sm">{activeService.pickup_address ?? `${activeService.pickup_lat}, ${activeService.pickup_lng}`}</p>
              </div>
              {activeService.destination_address && (
                <div>
                  <p className="text-xs text-gray-400">Destino</p>
                  <p className="text-sm">{activeService.destination_address}</p>
                </div>
              )}
              {activeService.fare && (
                <div>
                  <p className="text-xs text-gray-400">Tarifa</p>
                  <p className="font-bold text-green-600">${activeService.fare.toFixed(2)}</p>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              {activeService.status === 'assigned' && (
                <button
                  onClick={startService}
                  className="flex-1 bg-orange-500 text-white py-3 rounded-xl font-medium text-sm hover:bg-orange-600"
                >
                  Iniciar viaje
                </button>
              )}
              {activeService.status === 'in_progress' && (
                <button
                  onClick={completeService}
                  className="flex-1 bg-green-500 text-white py-3 rounded-xl font-medium text-sm hover:bg-green-600"
                >
                  Completar servicio
                </button>
              )}
              <button
                onClick={() => setShowBreakdownForm(true)}
                className="bg-red-100 text-red-600 px-4 py-3 rounded-xl text-sm font-medium hover:bg-red-200"
              >
                Avería
              </button>
            </div>
          </div>
        )}

        {/* Servicios pendientes */}
        {driver.status === 'available' && !activeService && pendingServices.length > 0 && (
          <div>
            <p className="text-sm font-semibold text-gray-600 mb-2">Servicios disponibles</p>
            <div className="space-y-3">
              {pendingServices.map(service => (
                <div key={service.id} className="bg-white rounded-2xl shadow-sm p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-semibold">{service.customer_name}</p>
                      <p className="text-xs text-gray-400">{service.motorcycle_types?.name ?? 'Cualquier tipo'}</p>
                    </div>
                    {service.fare && (
                      <span className="text-green-600 font-bold">${service.fare.toFixed(2)}</span>
                    )}
                  </div>
                  <div className="space-y-1 mb-3">
                    <p className="text-xs text-gray-400">Recogida</p>
                    <p className="text-sm">{service.pickup_address ?? `${service.pickup_lat}, ${service.pickup_lng}`}</p>
                  </div>
                  <button
                    onClick={() => acceptService(service.id)}
                    className="w-full bg-orange-500 text-white py-2 rounded-xl text-sm font-medium hover:bg-orange-600"
                  >
                    Aceptar servicio
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {driver.status === 'available' && !activeService && pendingServices.length === 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-400">
            <p className="text-3xl mb-2">🛵</p>
            <p className="text-sm">Esperando servicios...</p>
          </div>
        )}

        {/* Botón avería standalone */}
        {driver.status === 'available' && !activeService && (
          <button
            onClick={() => setShowBreakdownForm(true)}
            className="w-full bg-red-50 text-red-600 border border-red-200 py-3 rounded-2xl text-sm font-medium hover:bg-red-100"
          >
            🔧 Reportar avería
          </button>
        )}

        {/* Conductor en avería */}
        {driver.status === 'breakdown' && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-center">
            <p className="text-2xl mb-2">🔧</p>
            <p className="font-semibold text-red-700">Avería reportada</p>
            <p className="text-sm text-red-500 mt-1">El administrador fue notificado y está gestionando tu caso.</p>
          </div>
        )}

        {/* Modal avería */}
        {showBreakdownForm && (
          <div className="fixed inset-0 bg-black/50 flex items-end justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md">
              <h3 className="font-bold text-lg mb-4">Reportar avería</h3>
              <textarea
                value={breakdownDesc}
                onChange={e => setBreakdownDesc(e.target.value)}
                className="w-full border rounded-xl px-4 py-3 text-sm resize-none h-24 mb-4"
                placeholder="Describe el problema (pinchazo, falla de motor...)"
              />
              <div className="flex gap-3">
                <button
                  onClick={reportBreakdown}
                  className="flex-1 bg-red-500 text-white py-3 rounded-xl font-medium text-sm hover:bg-red-600"
                >
                  Enviar reporte
                </button>
                <button
                  onClick={() => setShowBreakdownForm(false)}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-medium text-sm"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
