import { supabase } from './supabase'

const BUCKET = 'poll-guest-photos'
export const MAX_DEVICE_PHOTOS = 10
/** @deprecated Use MAX_DEVICE_PHOTOS */
export const MAX_GUEST_PHOTOS = MAX_DEVICE_PHOTOS
/** @deprecated Use MAX_DEVICE_PHOTOS */
export const MAX_OPEN_PHOTOS = MAX_DEVICE_PHOTOS

export async function uploadGuestPhoto({
  albumId,
  tableId,
  displayName,
  deviceId,
  blob,
}) {
  const photoId = crypto.randomUUID()
  const path = `${albumId}/${photoId}.jpg`

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: blob.type || 'image/jpeg',
    cacheControl: '3600',
    upsert: false,
  })

  if (uploadError) throw uploadError

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path)
  const publicUrl = `${urlData.publicUrl}?v=${Date.now()}`

  const { data: photoIdRow, error: submitError } = await supabase.rpc(
    'submit_album_guest_photo',
    {
      p_album_id: albumId,
      p_table_id: tableId,
      p_display_name: displayName,
      p_device_id: deviceId,
      p_storage_path: path,
      p_public_url: publicUrl,
    }
  )

  if (submitError) {
    await supabase.storage.from(BUCKET).remove([path])
    throw submitError
  }

  return {
    id: photoIdRow,
    album_id: albumId,
    table_id: tableId,
    display_name: displayName,
    device_id: deviceId,
    storage_path: path,
    public_url: publicUrl,
    is_open_upload: false,
    created_at: new Date().toISOString(),
  }
}

export async function uploadOpenPhoto({ albumId, deviceId, displayName, blob, tableId = null }) {
  const photoId = crypto.randomUUID()
  const path = `${albumId}/${photoId}.jpg`

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: blob.type || 'image/jpeg',
    cacheControl: '3600',
    upsert: false,
  })

  if (uploadError) throw uploadError

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path)
  const publicUrl = `${urlData.publicUrl}?v=${Date.now()}`

  const { data: photoIdRow, error: submitError } = await supabase.rpc('submit_album_open_photo', {
    p_album_id: albumId,
    p_device_id: deviceId,
    p_display_name: displayName,
    p_storage_path: path,
    p_public_url: publicUrl,
    p_table_id: tableId,
  })

  if (submitError) {
    await supabase.storage.from(BUCKET).remove([path])
    throw submitError
  }

  return {
    id: photoIdRow,
    album_id: albumId,
    table_id: tableId,
    display_name: displayName.trim(),
    device_id: deviceId,
    storage_path: path,
    public_url: publicUrl,
    is_open_upload: true,
    created_at: new Date().toISOString(),
  }
}

export async function deleteGuestPhoto(photoId, deviceId) {
  const { data: photo, error: fetchError } = await supabase
    .from('album_guest_photos')
    .select('storage_path')
    .eq('id', photoId)
    .single()

  if (fetchError) throw fetchError

  const { error: rpcError } = await supabase.rpc('delete_album_guest_photo', {
    p_photo_id: photoId,
    p_device_id: deviceId,
  })

  if (rpcError) throw rpcError

  await supabase.storage.from(BUCKET).remove([photo.storage_path])
}

export async function replaceGuestPhotoImage(photoId, deviceId, blob) {
  const { data: photo, error: fetchError } = await supabase
    .from('album_guest_photos')
    .select('storage_path')
    .eq('id', photoId)
    .single()

  if (fetchError) throw fetchError

  await supabase.storage.from(BUCKET).remove([photo.storage_path])

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(
    photo.storage_path,
    blob,
    {
      contentType: blob.type || 'image/jpeg',
      cacheControl: '3600',
      upsert: false,
    }
  )

  if (uploadError) throw uploadError

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(photo.storage_path)
  const publicUrl = `${urlData.publicUrl}?v=${Date.now()}`

  const { error: rpcError } = await supabase.rpc('update_album_guest_photo', {
    p_photo_id: photoId,
    p_device_id: deviceId,
    p_public_url: publicUrl,
  })

  if (rpcError) throw rpcError

  return publicUrl
}

export async function importPollRosterToAlbum(albumId, pollId) {
  const { data, error } = await supabase.rpc('import_poll_roster_to_album', {
    p_album_id: albumId,
    p_poll_id: pollId,
  })

  if (error) throw error
  return data
}
