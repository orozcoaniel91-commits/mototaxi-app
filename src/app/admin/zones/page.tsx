'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Zone } from '@/lib/supabase/types'
import { ConfirmModal } from '@/components/ConfirmModal'

const EyeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
  </svg>
)

const PencilIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
)

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6M14 11v6"/>
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
)

function ZoneDetailModal({ zone, onClose }: { zone: Zone; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="font-bold text-gray-800">Detalle de zona</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>
        <div className="px-6 py-5 space-y-3 text-sm">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Nombre</p>
            <p className="font-medium text-gray-800">{zone.name}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Descripción</p>
            <p className="text-gray-700">{zone.description ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Tarifa base</p>
            <p className="font-semibold text-gray-800">${zone.base_fare.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Creada</p>
            <p className="text-gray-500">{new Date(zone.created_at).toLocaleDateString('es')}</p>
          </div>
        </div>
        <div className="px-6 pb-5">
          <button onClick={onClose} className="w-full bg-gray-100 text-gray-700 py-2 rounded-xl text-sm font-medium hover:bg-gray-200">Cerrar</button>
        </div>
      </div>
    </div>
  )
}

function ZoneEditModal({ zone, onSave, onClose }: { zone: Zone; onSave: () => void; onClose: () => void }) {
  const [form, setForm] = useState({ name: zone.name, description: zone.description ?? '', base_fare: String(zone.base_fare) })
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  async function handleSubmit() {
    setSaving(true)
    await supabase.from('zones').update({
      name: form.name,
      description: form.description || null,
      base_fare: parseFloat(form.base_fare),
    }).eq('id', zone.id)
    setSaving(false)
    onSave()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="font-bold text-gray-800">Editar zona</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>
        <form onSubmit={e => { e.preventDefault(); void handleSubmit() }} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
            <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Opcional" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tarifa base</label>
            <input required type="number" min="0" step="0.01" value={form.base_fare} onChange={e => setForm({ ...form, base_fare: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={saving} className="flex-1 bg-orange-500 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-orange-600 disabled:opacity-50">
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
            <button type="button" onClick={onClose} className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-200">Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function ZonesPage() {
  const [zones, setZones] = useState<Zone[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', base_fare: '' })
  const [saving, setSaving] = useState(false)
  const [viewing, setViewing] = useState<Zone | null>(null)
  const [editing, setEditing] = useState<Zone | null>(null)
  const [deleting, setDeleting] = useState<Zone | null>(null)
  const supabase = createClient()

  async function loadZones() {
    const { data } = await supabase.from('zones').select('*').order('name')
    setZones(data ?? [])
    setLoading(false)
  }

  useEffect(() => { loadZones() }, [])

  async function handleSubmit() {
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

  async function handleDelete() {
    if (!deleting) return
    await supabase.from('zones').delete().eq('id', deleting.id)
    setDeleting(null)
    loadZones()
  }

  return (
    <div>
      {viewing && <ZoneDetailModal zone={viewing} onClose={() => setViewing(null)} />}
      {editing && <ZoneEditModal zone={editing} onSave={() => { setEditing(null); loadZones() }} onClose={() => setEditing(null)} />}
      {deleting && (
        <ConfirmModal
          description={`¿Deseas eliminar la zona "${deleting.name}"? Esta acción no se puede deshacer.`}
          onConfirm={handleDelete}
          onClose={() => setDeleting(null)}
        />
      )}

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Zonas de operación</h2>
        <button onClick={() => setShowForm(!showForm)} className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors">
          + Nueva zona
        </button>
      </div>

      {showForm && (
        <form onSubmit={e => { e.preventDefault(); void handleSubmit() }} className="bg-white rounded-xl shadow-sm p-6 mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
            <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Ej: Centro" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Opcional" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tarifa base</label>
            <input required type="number" min="0" step="0.01" value={form.base_fare} onChange={e => setForm({ ...form, base_fare: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="0.00" />
          </div>
          <div className="md:col-span-3 flex gap-3">
            <button type="submit" disabled={saving} className="bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600 disabled:opacity-50 text-sm">
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 text-sm">Cancelar</button>
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
                <th className="text-left px-6 py-3 text-gray-600 font-medium">Acciones</th>
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
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <button title="Ver detalles" onClick={() => setViewing(zone)} className="text-blue-500 hover:text-blue-700"><EyeIcon /></button>
                      <button title="Editar" onClick={() => setEditing(zone)} className="text-gray-400 hover:text-gray-700"><PencilIcon /></button>
                      <button title="Eliminar" onClick={() => setDeleting(zone)} className="text-red-400 hover:text-red-600"><TrashIcon /></button>
                    </div>
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
