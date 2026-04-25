'use client'

import { useEffect, useRef } from 'react'
import { Driver } from '@/lib/supabase/types'

interface Props {
  drivers: Driver[]
}

const statusColors: Record<string, string> = {
  available: '#22c55e',
  busy: '#f97316',
  offline: '#9ca3af',
  breakdown: '#ef4444',
}

const statusLabels: Record<string, string> = {
  available: 'Disponible',
  busy: 'En servicio',
  offline: 'Desconectado',
  breakdown: 'Avería',
}

export default function DriversMap({ drivers }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const markersRef = useRef<Map<string, L.Marker>>(new Map())

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    import('leaflet').then((L) => {
      // Fix default icon issue with Next.js
      delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      const map = L.map(mapRef.current!).setView([0, 0], 13)

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(map)

      mapInstanceRef.current = map
    })

    return () => {
      mapInstanceRef.current?.remove()
      mapInstanceRef.current = null
      markersRef.current.clear()
    }
  }, [])

  useEffect(() => {
    if (!mapInstanceRef.current) return

    import('leaflet').then((L) => {
      const map = mapInstanceRef.current!
      const activeDrivers = drivers.filter(d => d.current_lat && d.current_lng)

      if (activeDrivers.length === 0) return

      // Actualizar o crear marcadores
      activeDrivers.forEach((driver) => {
        const lat = driver.current_lat!
        const lng = driver.current_lng!
        const color = statusColors[driver.status] ?? '#9ca3af'

        const icon = L.divIcon({
          html: `
            <div style="
              background:${color};
              width:36px;height:36px;
              border-radius:50%;
              border:3px solid white;
              box-shadow:0 2px 8px rgba(0,0,0,0.3);
              display:flex;align-items:center;justify-content:center;
              font-size:18px;
            ">🏍️</div>
          `,
          className: '',
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        })

        const popup = `
          <div style="font-family:sans-serif;min-width:140px">
            <p style="font-weight:bold;margin:0 0 4px">${driver.name}</p>
            <p style="color:#666;font-size:12px;margin:0 0 2px">${driver.phone}</p>
            <span style="
              background:${color};color:white;
              padding:2px 8px;border-radius:99px;font-size:11px
            ">${statusLabels[driver.status]}</span>
          </div>
        `

        if (markersRef.current.has(driver.id)) {
          const marker = markersRef.current.get(driver.id)!
          marker.setLatLng([lat, lng])
          marker.setIcon(icon)
          marker.setPopupContent(popup)
        } else {
          const marker = L.marker([lat, lng], { icon })
            .addTo(map)
            .bindPopup(popup)
          markersRef.current.set(driver.id, marker)
        }
      })

      // Eliminar marcadores de conductores sin ubicación
      markersRef.current.forEach((marker, id) => {
        if (!activeDrivers.find(d => d.id === id)) {
          marker.remove()
          markersRef.current.delete(id)
        }
      })

      // Centrar mapa en los conductores activos
      if (activeDrivers.length > 0 && markersRef.current.size > 0) {
        const bounds = L.latLngBounds(activeDrivers.map(d => [d.current_lat!, d.current_lng!]))
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 })
      }
    })
  }, [drivers])

  return (
    <>
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      />
      <div ref={mapRef} className="w-full h-full rounded-xl" />
    </>
  )
}
