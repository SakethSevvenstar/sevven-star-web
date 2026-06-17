import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or Anon Key not set. Using demo mode.')
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

export async function readFromDb(table) {
  if (!supabase) return []
  try {
    const { data, error } = await supabase.from(table).select('*')
    if (error) throw error
    return data || []
  } catch (e) {
    console.error(`Error reading ${table}:`, e)
    return []
  }
}

export async function insertToDb(table, record) {
  if (!supabase) return { data: record, error: null }
  try {
    const { data, error } = await supabase.from(table).insert([record]).select()
    if (error) throw error
    return { data: data?.[0], error: null }
  } catch (e) {
    console.error(`Error inserting to ${table}:`, e)
    return { data: null, error: e.message }
  }
}

export async function updateInDb(table, id, updates) {
  if (!supabase) return { data: null, error: null }
  try {
    const { data, error } = await supabase.from(table).update(updates).eq('id', id).select()
    if (error) throw error
    return { data: data?.[0], error: null }
  } catch (e) {
    console.error(`Error updating ${table}:`, e)
    return { data: null, error: e.message }
  }
}

export async function deleteFromDb(table, id) {
  if (!supabase) return { error: null }
  try {
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) throw error
    return { error: null }
  } catch (e) {
    console.error(`Error deleting from ${table}:`, e)
    return { error: e.message }
  }
}
