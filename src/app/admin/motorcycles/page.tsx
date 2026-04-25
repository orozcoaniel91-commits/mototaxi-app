'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Motorcycle, MotorcycleType, Driver } from '@/lib/supabase/types'

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  maintenance: 'bg-yellow-100 text-yellow-700',
  inactive: 'bg-gray-100 text-gray-600',
  breakdown: 'bg-red-100 text-red-700',
}

const statusLabels: Record<string, string> = {
  active: 'Activa',
  maintenance: 'Mantenimiento',
  inactive: 'Inactiva',
  breakdown: 'Avería',
}

export default function MotorcyclesPage() {
  const [motorcycles, setMotorcycles] = useState<Motorcycle[]>([])
  const [types, setTypes] = useState<MotorcycleType[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ plate: '', brand: '', model: '', year: '', motorcycle_type_id: '', driver_id: '' })
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  async function loadData() {
    const [{ data: motoData }, { data: typesData }, { data: driversData }] = await Promise.all([
      supabase.from('motorcycles').select('*, motorcycle_types(name)').order('plate'),
      supabase.from('motorcycle_types').select('*'),
      supabase.from('drivers').select('id, name').eq('status', 'offline').order('name'),
    ])
    setMotorcycles(motoData ?? [])
    setTypes(typesData ?? [])
    setDrivers(driversData ?? [])
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const { data: moto } = await supabase.from('motorcycles').insert({
      plate: form.plate,
      brand: form.brand || null,
      model: form.model || null,
      year: form.year ? parseInt(form.year) : null,
      motorcycle_type_id: form.motorcycle_type_id ? parseInt(form.motorcycle_type_id) : null,
    }).select().single()

    if (moto && form.driver_id) {
      await supabase.from('driver_motorcycle_assignments').insert({
        driver_id: form.driver_id,
        motorcycle_id: moto.id,
        is_active: true,
      })
    }

    setForm({ plate: '', brand: '', model: '', year: '', motorcycle_type_id: '', driver_id: '' })
    setShowForm(false)
    setSaving(false)
    loadData()
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar esta moto?')) return
    await supabase.from('motorcycles').delete().eq('id', id)
    loadData()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Motocicletas</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors"
        >
          + Nueva moto
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6 mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Placa</label>
            <input
              required
              value={form.plate}
              onChange={e => setForm({ ...form, plate: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="ABC-123"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Marca</label>
            <input
              value={form.brand}
              onChange={e => setForm({ ...form, brand: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Honda, Yamaha..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Modelo</label>
            <input
              value={form.model}
              onChange={e => setForm({ ...form, model: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="CB125, FZ..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Año</label>
            <input
              type="number"
              value={form.year}
              onChange={e => setForm({ ...form, year: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="2023"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
            <select
              value={form.motorcycle_type_id}
              onChange={e => setForm({ ...form, motorcycle_type_id: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Seleccionar tipo</option>
              {types.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Asignar conductor</label>
            <select
              value={form.driver_id}
              onChange={e => setForm({ ...form, driver_id: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Sin conductor por ahora</option>
              {drivers.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-3 flex gap-3">
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
                <th className="text-left px-6 py-3 text-gray-600 font-medium">Placa</th>
                <th className="text-left px-6 py-3 text-gray-600 font-medium">Marca / Modelo</th>
                <th className="text-left px-6 py-3 text-gray-600 font-medium">Año</th>
                <th className="text-left px-6 py-3 text-gray-600 font-medium">Tipo</th>
                <th className="text-left px-6 py-3 text-gray-600 font-medium">Estado</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {motorcycles.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400">No hay motos registradas</td></tr>
              )}
              {motorcycles.map(moto => (
                <tr key={moto.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium">{moto.plate}</td>
                  <td className="px-6 py-4 text-gray-500">{[moto.brand, moto.model].filter(Boolean).join(' ') || '—'}</td>
                  <td className="px-6 py-4 text-gray-500">{moto.year ?? '—'}</td>
                  <td className="px-6 py-4 text-gray-500">{moto.motorcycle_types?.name ?? '—'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[moto.status]}`}>
                      {statusLabels[moto.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleDelete(moto.id)}
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
