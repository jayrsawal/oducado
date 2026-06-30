import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY in .env.local'
  )
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey)

export const POLL_SELECT = `
  id,
  title,
  description,
  status,
  opens_at,
  closes_at,
  created_at,
  poll_categories (
    id,
    name,
    description,
    min_selections,
    max_selections,
    display_order,
    poll_options (
      id,
      label,
      description,
      display_order,
      image_url,
      image_updated_at
    )
  )
`

export function compareOptionLabels(a, b) {
  return a.localeCompare(b, undefined, { sensitivity: 'base' })
}

export function sortPollOptions(options) {
  if (!options) return []
  return [...options].sort((a, b) => compareOptionLabels(a.label, b.label))
}

export function sortPollCategories(poll) {
  if (!poll?.poll_categories) return poll
  poll.poll_categories.sort((a, b) => a.display_order - b.display_order)
  for (const category of poll.poll_categories) {
    category.poll_options = sortPollOptions(category.poll_options)
  }
  return poll
}
