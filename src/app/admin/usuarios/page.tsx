'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ConfirmModal } from '@/components/ConfirmModal'

interface AdminUser {
  id: string
  username: string
  role: string
  created_at: string
}

const roleLabels: Record<string, string> = {
  admin: 'Administrador',
}

const roleColors: Record<string, string> = {
  admin: 'bg-orange-100 text-orange-700',
}

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6M14 11v6"/>
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
)

const PencilIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
)

function EditModal({ user, onSave, onClose }: { user: AdminUser; onSave: () => void; onClose: () => void }) {
  const [form, setForm] = useState({ username: user.username, password: '', role: user.role })
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  async function handleSubmit() {
    setSaving(true)
    const update: Record<string, string> = { username: form.username, role: form.role }
    if (form.password) update.password = form.password
    await supabase.from('admin_users').update(update).eq('id', user.id)
    setSaving(false)
    onSave()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="font-bold text-gray-800">Editar usuario</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>
        <form onSubmit={e => { e.preventDefault(); void handleSubmit() }} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Usuario</label>
            <input required value={form.username} onChange={e => setForm({ ...form, username: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nueva contraseña <span className="text-gray-400 font-normal">(dejar vacío para no cambiar)</span>
            </label>
            <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Nueva contraseña" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
            <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm">
              <option value="admin">Administrador</option>
            </select>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={saving}
              className="flex-1 bg-orange-500 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-orange-600 disabled:opacity-50">
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
            <button type="button" onClick={onClose}
              className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-200">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function UsuariosPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ username: '', password: '', role: 'admin' })
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState<AdminUser | null>(null)
  const [deleting, setDeleting] = useState<AdminUser | null>(null)
  const currentId = typeof window !== 'undefined' ? localStorage.getItem('admin_id') : null
  const supabase = createClient()

  async function loadUsers() {
    const { data } = await supabase.from('admin_users').select('id, username, role, created_at').order('created_at')
    setUsers(data ?? [])
    setLoading(false)
  }

  useEffect(() => { loadUsers() }, [])

  async function handleCreate() {
    setSaving(true)
    await supabase.from('admin_users').insert({ username: form.username, password: form.password, role: form.role })
    setForm({ username: '', password: '', role: 'admin' })
    setShowForm(false)
    setSaving(false)
    loadUsers()
  }

  async function handleDelete() {
    if (!deleting) return
    await supabase.from('admin_users').delete().eq('id', deleting.id)
    setDeleting(null)
    loadUsers()
  }

  return (
    <div>
      {editing && (
        <EditModal user={editing} onSave={() => { setEditing(null); loadUsers() }} onClose={() => setEditing(null)} />
      )}
      {deleting && (
        <ConfirmModal
          description={`¿Eliminar al usuario "${deleting.username}"? Esta acción no se puede deshacer.`}
          onConfirm={handleDelete}
          onClose={() => setDeleting(null)}
        />
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Usuarios del sistema</h2>
          <p className="text-sm text-gray-400 mt-0.5">Gestiona los accesos al panel de administración</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors">
          + Nuevo usuario
        </button>
      </div>

      {showForm && (
        <form onSubmit={e => { e.preventDefault(); void handleCreate() }}
          className="bg-white rounded-xl shadow-sm p-6 mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Usuario</label>
            <input required value={form.username} onChange={e => setForm({ ...form, username: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="nombre de usuario" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
            <input required type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="contraseña" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
            <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm">
              <option value="admin">Administrador</option>
            </select>
          </div>
          <div className="md:col-span-3 flex gap-3">
            <button type="submit" disabled={saving}
              className="bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600 disabled:opacity-50 text-sm">
              {saving ? 'Guardando...' : 'Crear usuario'}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 text-sm">
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
                <th className="text-left px-6 py-3 text-gray-600 font-medium">Usuario</th>
                <th className="text-left px-6 py-3 text-gray-600 font-medium">Rol</th>
                <th className="text-left px-6 py-3 text-gray-600 font-medium">Creado</th>
                <th className="text-left px-6 py-3 text-gray-600 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.length === 0 && (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-400">No hay usuarios</td></tr>
              )}
              {users.map(user => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium">
                    {user.username}
                    {user.id === currentId && (
                      <span className="ml-2 text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">Tú</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${roleColors[user.role] ?? 'bg-gray-100 text-gray-600'}`}>
                      {roleLabels[user.role] ?? user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {new Date(user.created_at).toLocaleDateString('es')}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <button title="Editar" onClick={() => setEditing(user)} className="text-gray-400 hover:text-gray-700">
                        <PencilIcon />
                      </button>
                      <button
                        title="Eliminar"
                        onClick={() => setDeleting(user)}
                        disabled={user.id === currentId}
                        className="text-red-400 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <TrashIcon />
                      </button>
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
