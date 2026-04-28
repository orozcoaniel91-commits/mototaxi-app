import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-orange-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-10">
          <div className="text-6xl mb-3">🏍️</div>
          <h1 className="text-4xl font-bold text-gray-800">MotoTaxi</h1>
          <p className="text-gray-500 mt-2">¿Qué deseas hacer?</p>
        </div>

        {/* Opciones principales */}
        <div className="space-y-4">
          <Link href="/pedir"
            className="flex items-center gap-4 bg-orange-500 text-white px-6 py-5 rounded-2xl shadow-md hover:bg-orange-600 active:scale-95 transition-all"
          >
            <span className="text-3xl">🛵</span>
            <div>
              <p className="font-bold text-lg leading-tight">Pedir moto</p>
              <p className="text-orange-100 text-sm">Solicita una moto ahora</p>
            </div>
            <span className="ml-auto text-orange-200 text-xl">›</span>
          </Link>

          <Link href="/planes"
            className="flex items-center gap-4 bg-white text-gray-800 px-6 py-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md active:scale-95 transition-all"
          >
            <span className="text-3xl">🔄</span>
            <div>
              <p className="font-bold text-lg leading-tight">Mis planes fijos</p>
              <p className="text-gray-400 text-sm">Recogidas programadas</p>
            </div>
            <span className="ml-auto text-gray-300 text-xl">›</span>
          </Link>
        </div>

        {/* Separador */}
        <div className="flex items-center gap-3 my-8">
          <div className="flex-1 h-px bg-gray-200" />
          <p className="text-xs text-gray-400">Acceso personal</p>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Conductor */}
        <Link href="/driver"
          className="flex items-center gap-4 bg-gray-900 text-white px-6 py-4 rounded-2xl hover:bg-gray-800 active:scale-95 transition-all"
        >
          <span className="text-2xl">👤</span>
          <div>
            <p className="font-semibold leading-tight">Soy conductor</p>
            <p className="text-gray-400 text-xs">Ingresa a tu app</p>
          </div>
          <span className="ml-auto text-gray-500 text-xl">›</span>
        </Link>

        {/* Admin — discreto */}
        <div className="text-center mt-8">
          <Link href="/admin" className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2">
            Panel de administración
          </Link>
        </div>

      </div>
    </div>
  )
}
