'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Zone } from '@/lib/supabase/types'

export default function ZonesPage() {
  const [zones, setZones] = useState<Zone[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', base_fare: '' })
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  async function loadZones() {
    const { data } = await supabase.from('zones').select('*').order('name')
    setZones(data ?? [])
    setLoading(false)
  }

  useEffect(() => { loadZones() }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await supabase.from('zones').insert({
      name: form.name,
      description: form.description || null,
      base_fare: parseFloat(form.base_fare),
    })
    setForm({ name: '', description: '', base_fare: '' })
    setShowForm(false)
    setSaving(false)
    loadZones()
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar esta zona?')) return
    await supabase.from('zones').delete().eq('id', id)
    loadZones()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Zonas de operación</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors"
        >
          + Nueva zona
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6 mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
            <input
              required
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Ej: Centro"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <input
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Opcional"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tarifa base</label>
            <input
              required
              type="number"
              min="0"
              step="0.01"
              value={form.base_fare}
              onChange={e => setForm({ ...form, base_fare: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="0.00"
            />
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
                <th className="text-left px-6 py-3 text-gray-600 font-medium">Nombre</th>
                <th className="text-left px-6 py-3 text-gray-600 font-medium">Descripción</th>
                <th className="text-left px-6 py-3 text-gray-600 font-medium">Tarifa base</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {zones.length === 0 && (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-400">No hay zonas registradas</td></tr>
              )}
              {zones.map(zone => (
                <tr key={zone.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium">{zone.name}</td>
                  <td className="px-6 py-4 text-gray-500">{zone.description ?? '—'}</td>
                  <td className="px-6 py-4">${zone.base_fare.toFixed(2)}</td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleDelete(zone.id)}
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
