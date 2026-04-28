'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Driver, Zone } from '@/lib/supabase/types'
import { ConfirmModal } from '@/components/ConfirmModal'

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

function DriverDetailModal({ driver, onClose }: { driver: Driver; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="font-bold text-gray-800">Detalle del conductor</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>
        <div className="px-6 py-5 space-y-3 text-sm">
          <div><p className="text-xs text-gray-400 mb-0.5">Nombre</p><p className="font-medium text-gray-800">{driver.name}</p></div>
          <div><p className="text-xs text-gray-400 mb-0.5">Teléfono</p><p className="text-gray-700">{driver.phone}</p></div>
          <div><p className="text-xs text-gray-400 mb-0.5">Email</p><p className="text-gray-700">{driver.email ?? '—'}</p></div>
          <div><p className="text-xs text-gray-400 mb-0.5">Zona</p><p className="text-gray-700">{driver.zones?.name ?? '—'}</p></div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Estado</p>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[driver.status]}`}>{statusLabels[driver.status]}</span>
          </div>
          <div><p className="text-xs text-gray-400 mb-0.5">Registrado</p><p className="text-gray-500">{new Date(driver.created_at).toLocaleDateString('es')}</p></div>
        </div>
        <div className="px-6 pb-5">
          <button onClick={onClose} className="w-full bg-gray-100 text-gray-700 py-2 rounded-xl text-sm font-medium hover:bg-gray-200">Cerrar</button>
        </div>
      </div>
    </div>
  )
}

function DriverEditModal({ driver, zones, onSave, onClose }: { driver: Driver; zones: Zone[]; onSave: () => void; onClose: () => void }) {
  const [form, setForm] = useState({ name: driver.name, phone: driver.phone, email: driver.email ?? '', zone_id: driver.zone_id ?? '', password: '' })
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  async function handleSubmit() {
    setSaving(true)
    const update: Record<string, string | null> = {
      name: form.name,
      phone: form.phone,
      email: form.email || null,
      zone_id: form.zone_id || null,
    }
    if (form.password) update.password = form.password
    await supabase.from('drivers').update(update).eq('id', driver.id)
    setSaving(false)
    onSave()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="font-bold text-gray-800">Editar conductor</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>
        <form onSubmit={e => { e.preventDefault(); void handleSubmit() }} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo</label>
            <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
            <input required value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email (opcional)</label>
            <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Zona</label>
            <select value={form.zone_id} onChange={e => setForm({ ...form, zone_id: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
              <option value="">Sin zona asignada</option>
              {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nueva contraseña <span className="text-gray-400 font-normal">(dejar vacío para no cambiar)</span></label>
            <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Nueva contraseña" />
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

export default function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [zones, setZones] = useState<Zone[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', email: '', zone_id: '', password: '' })
  const [saving, setSaving] = useState(false)
  const [viewing, setViewing] = useState<Driver | null>(null)
  const [editing, setEditing] = useState<Driver | null>(null)
  const [deleting, setDeleting] = useState<Driver | null>(null)
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

  async function handleSubmit() {
    setSaving(true)
    await supabase.from('drivers').insert({
      name: form.name,
      phone: form.phone,
      email: form.email || null,
      zone_id: form.zone_id || null,
      password: form.password || null,
    })
    setForm({ name: '', phone: '', email: '', zone_id: '', password: '' })
    setShowForm(false)
    setSaving(false)
    loadData()
  }

  async function handleDelete() {
    if (!deleting) return
    await supabase.from('drivers').delete().eq('id', deleting.id)
    setDeleting(null)
    loadData()
  }

  return (
    <div>
      {viewing && <DriverDetailModal driver={viewing} onClose={() => setViewing(null)} />}
      {editing && <DriverEditModal driver={editing} zones={zones} onSave={() => { setEditing(null); loadData() }} onClose={() => setEditing(null)} />}
      {deleting && (
        <ConfirmModal
          description={`¿Deseas eliminar al conductor "${deleting.name}"? Esta acción no se puede deshacer.`}
          onConfirm={handleDelete}
          onClose={() => setDeleting(null)}
        />
      )}

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Conductores</h2>
        <button onClick={() => setShowForm(!showForm)} className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors">
          + Nuevo conductor
        </button>
      </div>

      {showForm && (
        <form onSubmit={e => { e.preventDefault(); void handleSubmit() }} className="bg-white rounded-xl shadow-sm p-6 mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo</label>
            <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Nombre del conductor" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
            <input required value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Número de teléfono" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email (opcional)</label>
            <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="correo@ejemplo.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Zona</label>
            <select value={form.zone_id} onChange={e => setForm({ ...form, zone_id: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
              <option value="">Sin zona asignada</option>
              {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
            <input required type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Contraseña de acceso" />
          </div>
          <div className="md:col-span-2 flex gap-3">
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
                <th className="text-left px-6 py-3 text-gray-600 font-medium">Teléfono</th>
                <th className="text-left px-6 py-3 text-gray-600 font-medium">Zona</th>
                <th className="text-left px-6 py-3 text-gray-600 font-medium">Estado</th>
                <th className="text-left px-6 py-3 text-gray-600 font-medium">Acciones</th>
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
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[driver.status]}`}>{statusLabels[driver.status]}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <button title="Ver detalles" onClick={() => setViewing(driver)} className="text-blue-500 hover:text-blue-700"><EyeIcon /></button>
                      <button title="Editar" onClick={() => setEditing(driver)} className="text-gray-400 hover:text-gray-700"><PencilIcon /></button>
                      <button title="Eliminar" onClick={() => setDeleting(driver)} className="text-red-400 hover:text-red-600"><TrashIcon /></button>
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
