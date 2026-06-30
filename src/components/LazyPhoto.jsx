/**
 * Deferred image loading for long photo lists. Use loading="eager" for lightboxes
 * and other above-the-fold previews.
 */
export default function LazyPhoto({
  loading = 'lazy',
  decoding = 'async',
  alt = '',
  ...props
}) {
  return <img loading={loading} decoding={decoding} alt={alt} {...props} />
}
