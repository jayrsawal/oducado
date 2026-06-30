import { supabase } from './supabase'

const BUCKET = 'poll-option-images'

export async function uploadOptionPhoto(pollId, optionId, blob) {
  const path = `${pollId}/${optionId}.jpg`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, {
      upsert: true,
      contentType: 'image/jpeg',
      cacheControl: '3600',
    })

  if (uploadError) throw uploadError

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path)
  const version = Date.now()
  const image_url = `${urlData.publicUrl}?v=${version}`

  const { error: updateError } = await supabase
    .from('poll_options')
    .update({
      image_url,
      image_updated_at: new Date(version).toISOString(),
    })
    .eq('id', optionId)

  if (updateError) throw updateError

  return image_url
}

export async function removeOptionPhoto(pollId, optionId) {
  const path = `${pollId}/${optionId}.jpg`

  await supabase.storage.from(BUCKET).remove([path])

  const { error } = await supabase
    .from('poll_options')
    .update({ image_url: null, image_updated_at: null })
    .eq('id', optionId)

  if (error) throw error
}
