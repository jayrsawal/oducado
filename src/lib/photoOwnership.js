export function isMyPhoto(photo, deviceId) {
  return Boolean(deviceId && photo?.device_id === deviceId)
}

export function canEditPhotoAssignment(photo, deviceId, hasStoryTargets = false) {
  return Boolean(photo?.is_open_upload && isMyPhoto(photo, deviceId) && hasStoryTargets)
}
