'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function DriverLogin() {
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin() {
    setLoading(true)
    setError('')

    const { data: driver } = await supabase
      .from('drivers')
      .select('*')
      .eq('phone', phone.trim())
      .single()

    if (!driver) {
      setError('Teléfono o contraseña incorrectos.')
      setLoading(false)
      return
    }

    if (!driver.password || driver.password !== password) {
      setError('Teléfono o contraseña incorrectos.')
      setLoading(false)
      return
    }

    localStorage.setItem('driver_id', driver.id)
    localStorage.setItem('driver_name', driver.name)
    router.push('/driver/home')
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-8">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🏍️</div>
          <h1 className="text-2xl font-bold text-gray-800">MotoTaxi</h1>
          <p className="text-gray-500 text-sm mt-1">Acceso para conductores</p>
        </div>

        <form onSubmit={e => { e.preventDefault(); void handleLogin() }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Número de teléfono
            </label>
            <input
              required
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              placeholder="Ej: 0991234567"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contraseña
            </label>
            <input
              required
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              placeholder="Tu contraseña"
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}

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
