'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Driver, Zone } from '@/lib/supabase/types'

const statusColors: Record<string, string> = {
  available: 'bg-green-100 text-green-700',
  busy: 'bg-yellow-100 text-yellow-700',
  offline: 'bg-gray-100 text-gray-600',
  breakdown: 'bg-red-100 text-red-700',
}

const statusLabels: Record<string, string> = {
  available: 'Disponible',
  busy: 'En servicio',
  offline: 'Desconectado',
  breakdown: 'Avería',
}

export default function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [zones, setZones] = useState<Zone[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', email: '', zone_id: '' })
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  async function loadData() {
    const [{ data: driversData }, { data: zonesData }] = await Promise.all([
      supabase.from('drivers').select('*, zones(name)').order('name'),
      supabase.from('zones').select('*').order('name'),
    ])
    setDrivers(driversData ?? [])
    setZones(zonesData ?? [])
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await supabase.from('drivers').insert({
      name: form.name,
      phone: form.phone,
      email: form.email || null,
      zone_id: form.zone_id || null,
    })
    setForm({ name: '', phone: '', email: '', zone_id: '' })
    setShowForm(false)
    setSaving(false)
    loadData()
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este conductor?')) return
    await supabase.from('drivers').delete().eq('id', id)
    loadData()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Conductores</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors"
        >
          + Nuevo conductor
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6 mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo</label>
            <input
              required
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Nombre del conductor"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
            <input
              required
              value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Número de teléfono"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email (opcional)</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="correo@ejemplo.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Zona</label>
            <select
              value={form.zone_id}
              onChange={e => setForm({ ...form, zone_id: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Sin zona asignada</option>
              {zones.map(z => (
                <option key={z.id} value={z.id}>{z.name}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2 flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600 disabled:opacity-50 text-sm"
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 text-sm"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-gray-500">Cargando...</p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-6 py-3 text-gray-600 font-medium">Nombre</th>
                <th className="text-left px-6 py-3 text-gray-600 font-medium">Teléfono</th>
                <th className="text-left px-6 py-3 text-gray-600 font-medium">Zona</th>
                <th className="text-left px-6 py-3 text-gray-600 font-medium">Estado</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {drivers.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400">No hay conductores registrados</td></tr>
              )}
              {drivers.map(driver => (
                <tr key={driver.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium">{driver.name}</td>
                  <td className="px-6 py-4 text-gray-500">{driver.phone}</td>
                  <td className="px-6 py-4 text-gray-500">{driver.zones?.name ?? '—'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[driver.status]}`}>
                      {statusLabels[driver.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleDelete(driver.id)}
                      className="text-red-500 hover:text-red-700 text-xs"
                    >
                      Eliminar
                    </button>
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
