'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AdminLogin() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin() {
    setLoading(true)
    setError('')

    const { data, error } = await supabase
      .from('admin_users')
      .select('*')
      .eq('username', username.trim())
      .eq('password', password.trim())
      .maybeSingle()

    if (error) {
      setError('Error: ' + error.message)
      setLoading(false)
      return
    }

    if (!data) {
      setError('Usuario o contraseña incorrectos.')
      setLoading(false)
      return
    }

    localStorage.setItem('admin_id', data.id)
    localStorage.setItem('admin_username', data.username)
    localStorage.setItem('admin_role', data.role)
    router.push('/admin')
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-8">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🏍️</div>
          <h1 className="text-2xl font-bold text-gray-800">MotoTaxi</h1>
          <p className="text-gray-500 text-sm mt-1">Acceso al panel de administración</p>
        </div>

        <form onSubmit={e => { e.preventDefault(); void handleLogin() }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Usuario</label>
            <input
              required
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              placeholder="Nombre de usuario"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
            <input
              required
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              placeholder="Contraseña"
            />
          </div>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 text-white py-3 rounded-xl font-medium hover:bg-orange-600 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Verificando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
