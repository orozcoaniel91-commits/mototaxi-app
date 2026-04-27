'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Motorcycle, MotorcycleType } from '@/lib/supabase/types'
import { ConfirmModal } from '@/components/ConfirmModal'

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

function MotoDetailModal({ moto, onClose }: { moto: Motorcycle; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="font-bold text-gray-800">Detalle de motocicleta</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>
        <div className="px-6 py-5 space-y-3 text-sm">
          <div><p className="text-xs text-gray-400 mb-0.5">Placa</p><p className="font-medium text-gray-800">{moto.plate}</p></div>
          <div><p className="text-xs text-gray-400 mb-0.5">Marca</p><p className="text-gray-700">{moto.brand ?? '—'}</p></div>
          <div><p className="text-xs text-gray-400 mb-0.5">Modelo</p><p className="text-gray-700">{moto.model ?? '—'}</p></div>
          <div><p className="text-xs text-gray-400 mb-0.5">Año</p><p className="text-gray-700">{moto.year ?? '—'}</p></div>
          <div><p className="text-xs text-gray-400 mb-0.5">Tipo</p><p className="text-gray-700">{moto.motorcycle_types?.name ?? '—'}</p></div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Estado</p>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[moto.status]}`}>{statusLabels[moto.status]}</span>
          </div>
          <div><p className="text-xs text-gray-400 mb-0.5">Registrada</p><p className="text-gray-500">{new Date(moto.created_at).toLocaleDateString('es')}</p></div>
        </div>
        <div className="px-6 pb-5">
          <button onClick={onClose} className="w-full bg-gray-100 text-gray-700 py-2 rounded-xl text-sm font-medium hover:bg-gray-200">Cerrar</button>
        </div>
      </div>
    </div>
  )
}

function MotoEditModal({ moto, types, drivers, onSave, onClose }: {
  moto: Motorcycle
  types: MotorcycleType[]
  drivers: { id: string; name: string }[]
  onSave: () => void
  onClose: () => void
}) {
  const [form, setForm] = useState({
    plate: moto.plate,
    brand: moto.brand ?? '',
    model: moto.model ?? '',
    year: moto.year ? String(moto.year) : '',
    motorcycle_type_id: moto.motorcycle_type_id ? String(moto.motorcycle_type_id) : '',
    driver_id: '',
  })
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    supabase
      .from('driver_motorcycle_assignments')
      .select('driver_id')
      .eq('motorcycle_id', moto.id)
      .eq('is_active', true)
      .single()
      .then(({ data }) => {
        if (data) setForm(f => ({ ...f, driver_id: data.driver_id }))
      })
  }, [moto.id])

  async function handleSubmit() {
    setSaving(true)
    await supabase.from('motorcycles').update({
      plate: form.plate,
      brand: form.brand || null,
      model: form.model || null,
      year: form.year ? parseInt(form.year) : null,
      motorcycle_type_id: form.motorcycle_type_id ? parseInt(form.motorcycle_type_id) : null,
    }).eq('id', moto.id)

    // Deactivate current assignments for this motorcycle
    await supabase.from('driver_motorcycle_assignments').update({ is_active: false }).eq('motorcycle_id', moto.id)
    if (form.driver_id) {
      // Deactivate any other active moto the driver may have
      await supabase.from('driver_motorcycle_assignments').update({ is_active: false }).eq('driver_id', form.driver_id)
      // Insert fresh active assignment
      await supabase.from('driver_motorcycle_assignments').insert({
        driver_id: form.driver_id,
        motorcycle_id: moto.id,
        is_active: true,
      })
    }

    setSaving(false)
    onSave()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="font-bold text-gray-800">Editar motocicleta</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>
        <form onSubmit={e => { e.preventDefault(); void handleSubmit() }} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Placa</label>
            <input required value={form.plate} onChange={e => setForm({ ...form, plate: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Marca</label>
              <input value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Honda, Yamaha..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Modelo</label>
              <input value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="CB125, FZ..." />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Año</label>
              <input type="number" value={form.year} onChange={e => setForm({ ...form, year: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="2023" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
              <select value={form.motorcycle_type_id} onChange={e => setForm({ ...form, motorcycle_type_id: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="">Sin tipo</option>
                {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Conductor asignado</label>
            <select value={form.driver_id} onChange={e => setForm({ ...form, driver_id: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
              <option value="">Sin conductor</option>
              {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
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

export default function MotorcyclesPage() {
  const [motorcycles, setMotorcycles] = useState<Motorcycle[]>([])
  const [types, setTypes] = useState<MotorcycleType[]>([])
  const [drivers, setDrivers] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ plate: '', brand: '', model: '', year: '', motorcycle_type_id: '', driver_id: '' })
  const [saving, setSaving] = useState(false)
  const [viewing, setViewing] = useState<Motorcycle | null>(null)
  const [editing, setEditing] = useState<Motorcycle | null>(null)
  const [deleting, setDeleting] = useState<Motorcycle | null>(null)
  const supabase = createClient()

  async function loadData() {
    const [{ data: motoData }, { data: typesData }, { data: driversData }] = await Promise.all([
      supabase.from('motorcycles').select('*, motorcycle_types(name)').order('plate'),
      supabase.from('motorcycle_types').select('*'),
      supabase.from('drivers').select('id, name').order('name'),
    ])
    setMotorcycles(motoData ?? [])
    setTypes(typesData ?? [])
    setDrivers(driversData ?? [])
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  async function handleSubmit() {
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

  async function handleDelete() {
    if (!deleting) return
    await supabase.from('motorcycles').delete().eq('id', deleting.id)
    setDeleting(null)
    loadData()
  }

  return (
    <div>
      {viewing && <MotoDetailModal moto={viewing} onClose={() => setViewing(null)} />}
      {editing && <MotoEditModal moto={editing} types={types} drivers={drivers} onSave={() => { setEditing(null); loadData() }} onClose={() => setEditing(null)} />}
      {deleting && (
        <ConfirmModal
          description={`¿Deseas eliminar la moto "${deleting.plate}"? Esta acción no se puede deshacer.`}
          onConfirm={handleDelete}
          onClose={() => setDeleting(null)}
        />
      )}

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Motocicletas</h2>
        <button onClick={() => setShowForm(!showForm)} className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors">
          + Nueva moto
        </button>
      </div>

      {showForm && (
        <form onSubmit={e => { e.preventDefault(); void handleSubmit() }} className="bg-white rounded-xl shadow-sm p-6 mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Placa</label>
            <input required value={form.plate} onChange={e => setForm({ ...form, plate: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="ABC-123" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Marca</label>
            <input value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Honda, Yamaha..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Modelo</label>
            <input value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="CB125, FZ..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Año</label>
            <input type="number" value={form.year} onChange={e => setForm({ ...form, year: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="2023" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
            <select value={form.motorcycle_type_id} onChange={e => setForm({ ...form, motorcycle_type_id: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
              <option value="">Seleccionar tipo</option>
              {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Asignar conductor</label>
            <select value={form.driver_id} onChange={e => setForm({ ...form, driver_id: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
              <option value="">Sin conductor por ahora</option>
              {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
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
                <th className="text-left px-6 py-3 text-gray-600 font-medium">Placa</th>
                <th className="text-left px-6 py-3 text-gray-600 font-medium">Marca / Modelo</th>
                <th className="text-left px-6 py-3 text-gray-600 font-medium">Año</th>
                <th className="text-left px-6 py-3 text-gray-600 font-medium">Tipo</th>
                <th className="text-left px-6 py-3 text-gray-600 font-medium">Estado</th>
                <th className="text-left px-6 py-3 text-gray-600 font-medium">Acciones</th>
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
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[moto.status]}`}>{statusLabels[moto.status]}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <button title="Ver detalles" onClick={() => setViewing(moto)} className="text-blue-500 hover:text-blue-700"><EyeIcon /></button>
                      <button title="Editar" onClick={() => setEditing(moto)} className="text-gray-400 hover:text-gray-700"><PencilIcon /></button>
                      <button title="Eliminar" onClick={() => setDeleting(moto)} className="text-red-400 hover:text-red-600"><TrashIcon /></button>
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
