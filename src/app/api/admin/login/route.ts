import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { username, password } = await req.json() as { username: string; password: string }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await supabase
    .from('admin_users')
    .select('id, username, role')
    .eq('username', username.trim())
    .eq('password', password.trim())
    .maybeSingle()

  if (error || !data) {
    return NextResponse.json({ error: 'Credenciales incorrectas' }, { status: 401 })
  }

  return NextResponse.json(data)
}
