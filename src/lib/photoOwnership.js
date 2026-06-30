export function isMyPhoto(photo, deviceId) {
  return Boolean(deviceId && photo?.device_id === deviceId)
}
