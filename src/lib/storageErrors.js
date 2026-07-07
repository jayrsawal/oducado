const SIZE_LIMIT_PATTERN = /maximum allowed size/i

export function formatStorageError(error) {
  const message = error?.message ?? ''
  const status = error?.statusCode ?? error?.status

  if (status === 413 || status === '413' || SIZE_LIMIT_PATTERN.test(message)) {
    return (
      'This file is too large for your Supabase storage settings. ' +
      'Apply migration 022 (removes the bucket cap), then open Supabase Dashboard → Storage → Settings ' +
      'and raise the global file size limit. Free plans are capped at 50 MB; Pro and above can go much higher.'
    )
  }

  return message || 'Upload failed'
}
