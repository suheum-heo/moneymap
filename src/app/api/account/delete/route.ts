import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

function createServerSupabaseClient(key: string) {
  return createClient(supabaseUrl!, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

function getBearerToken(req: Request) {
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  return authHeader.slice('Bearer '.length).trim()
}

function isMissingOptionalTable(error: { code?: string; message?: string } | null) {
  if (!error) return false
  if (error.code === 'PGRST205' || error.code === '42P01') return true
  const message = (error.message || '').toLowerCase()
  return message.includes('could not find the table') || message.includes('relation') && message.includes('does not exist')
}

async function deleteRequiredUserRows(admin: ReturnType<typeof createServerSupabaseClient>, table: string, userId: string) {
  const { error } = await admin.from(table).delete().eq('user_id', userId)
  if (error) throw error
}

async function deleteOptionalProfileRows(admin: ReturnType<typeof createServerSupabaseClient>, userId: string) {
  const { error } = await admin.from('profiles').delete().eq('id', userId)
  if (error && !isMissingOptionalTable(error)) throw error
}

export async function POST(req: Request) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: 'Account deletion unavailable' }, { status: 500 })
  }

  const accessToken = getBearerToken(req)
  if (!accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userClient = createServerSupabaseClient(supabaseAnonKey)
  const { data: userData, error: userError } = await userClient.auth.getUser(accessToken)
  const user = userData.user

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!serviceRoleKey) {
    return NextResponse.json({ error: 'Account deletion unavailable' }, { status: 500 })
  }

  const admin = createServerSupabaseClient(serviceRoleKey)

  try {
    await deleteRequiredUserRows(admin, 'entries', user.id)
    await deleteRequiredUserRows(admin, 'budgets', user.id)
    await deleteRequiredUserRows(admin, 'recurring', user.id)
    await deleteRequiredUserRows(admin, 'categories', user.id)
    await deleteRequiredUserRows(admin, 'contexts', user.id)
    await deleteOptionalProfileRows(admin, user.id)

    const { error: deleteAuthError } = await admin.auth.admin.deleteUser(user.id)
    if (deleteAuthError) throw deleteAuthError

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Account deletion failed' }, { status: 500 })
  }
}
