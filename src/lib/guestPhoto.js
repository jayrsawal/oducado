import { extensionForVideoMime } from './videoPrepare'
import { formatStorageError } from './storageErrors'
import { supabase } from './supabase'

const BUCKET = 'poll-guest-photos'
export const MAX_DEVICE_PHOTOS = 10
/** @deprecated Use MAX_DEVICE_PHOTOS */
export const MAX_GUEST_PHOTOS = MAX_DEVICE_PHOTOS
/** @deprecated Use MAX_DEVICE_PHOTOS */
export const MAX_OPEN_PHOTOS = MAX_DEVICE_PHOTOS

function storageExtension(blob, mediaType) {
  if (mediaType === 'video') {
    return extensionForVideoMime(blob.type || 'video/mp4')
  }
  return 'jpg'
}

async function uploadStorageObject(path, blob, contentType) {
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType,
    cacheControl: '3600',
    upsert: false,
  })
  if (error) throw new Error(formatStorageError(error))
}

function publicUrlForPath(path) {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return `${data.publicUrl}?v=${Date.now()}`
}

async function removeStoragePaths(paths) {
  const unique = [...new Set(paths.filter(Boolean))]
  if (unique.length === 0) return
  await supabase.storage.from(BUCKET).remove(unique)
}

export async function uploadGuestPhoto({
  albumId,
  tableId,
  displayName,
  deviceId,
  blob,
}) {
  const photoId = crypto.randomUUID()
  const path = `${albumId}/${photoId}.jpg`

  await uploadStorageObject(path, blob, blob.type || 'image/jpeg')
  const publicUrl = publicUrlForPath(path)

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
    await removeStoragePaths([path])
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
    media_type: 'image',
    is_open_upload: false,
    created_at: new Date().toISOString(),
  }
}

export async function uploadOpenPhoto({
  albumId,
  deviceId,
  displayName,
  blob,
  mediaType = 'image',
  posterBlob = null,
  tableId = null,
  pollId = null,
  pollOptionId = null,
}) {
  const mediaId = crypto.randomUUID()
  const extension = storageExtension(blob, mediaType)
  const path = `${albumId}/${mediaId}.${extension}`
  const posterPath =
    mediaType === 'video' ? `${albumId}/${mediaId}-poster.jpg` : null

  const uploadedPaths = []

  try {
    await uploadStorageObject(
      path,
      blob,
      blob.type || (mediaType === 'video' ? 'video/mp4' : 'image/jpeg')
    )
    uploadedPaths.push(path)

    let posterUrl = null
    if (mediaType === 'video') {
      if (!posterBlob) throw new Error('Video poster is required')
      await uploadStorageObject(posterPath, posterBlob, 'image/jpeg')
      uploadedPaths.push(posterPath)
      posterUrl = publicUrlForPath(posterPath)
    }

    const publicUrl = publicUrlForPath(path)

    const { data: photoIdRow, error: submitError } = await supabase.rpc('submit_album_open_photo', {
      p_album_id: albumId,
      p_device_id: deviceId,
      p_display_name: displayName,
      p_storage_path: path,
      p_public_url: publicUrl,
      p_table_id: tableId,
      p_poll_id: pollId,
      p_poll_option_id: pollOptionId,
      p_media_type: mediaType,
      p_poster_storage_path: posterPath,
      p_poster_url: posterUrl,
    })

    if (submitError) throw submitError

    return {
      id: photoIdRow,
      album_id: albumId,
      table_id: tableId,
      poll_id: pollId,
      poll_option_id: pollOptionId,
      display_name: displayName.trim(),
      device_id: deviceId,
      storage_path: path,
      public_url: publicUrl,
      poster_url: posterUrl,
      poster_storage_path: posterPath,
      media_type: mediaType,
      is_open_upload: true,
      created_at: new Date().toISOString(),
    }
  } catch (error) {
    await removeStoragePaths(uploadedPaths)
    throw error
  }
}

export async function deleteGuestPhoto(photoId, deviceId) {
  const { data: photo, error: fetchError } = await supabase
    .from('album_guest_photos')
    .select('storage_path, poster_storage_path')
    .eq('id', photoId)
    .single()

  if (fetchError) throw fetchError

  const { error: rpcError } = await supabase.rpc('delete_album_guest_photo', {
    p_photo_id: photoId,
    p_device_id: deviceId,
  })

  if (rpcError) throw rpcError

  await removeStoragePaths([photo.storage_path, photo.poster_storage_path])
}

export async function deleteAlbumPhotoAdmin(photoId) {
  const { data: photo, error: fetchError } = await supabase
    .from('album_guest_photos')
    .select('storage_path, poster_storage_path, device_id')
    .eq('id', photoId)
    .single()

  if (fetchError) throw fetchError

  const { error: rpcError } = await supabase.rpc('delete_album_guest_photo', {
    p_photo_id: photoId,
    p_device_id: photo.device_id,
  })

  if (rpcError) throw rpcError

  await removeStoragePaths([photo.storage_path, photo.poster_storage_path])
}

export async function replaceGuestPhotoImage(photoId, deviceId, blob) {
  const { data: photo, error: fetchError } = await supabase
    .from('album_guest_photos')
    .select('storage_path, media_type')
    .eq('id', photoId)
    .single()

  if (fetchError) throw fetchError
  if (photo.media_type === 'video') {
    throw new Error('Videos cannot be rotated')
  }

  await supabase.storage.from(BUCKET).remove([photo.storage_path])

  await uploadStorageObject(photo.storage_path, blob, blob.type || 'image/jpeg')

  const publicUrl = publicUrlForPath(photo.storage_path)

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

export async function updatePhotoAssignment({
  photoId,
  deviceId,
  tableId = null,
  pollId = null,
  pollOptionId = null,
}) {
  const { error } = await supabase.rpc('update_album_photo_assignment', {
    p_photo_id: photoId,
    p_device_id: deviceId,
    p_table_id: tableId,
    p_poll_id: pollId,
    p_poll_option_id: pollOptionId,
  })

  if (error) throw error
}
