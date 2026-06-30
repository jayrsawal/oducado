export default function OptionVisual({ src, frameClass, imageClass, placeholderClass }) {
  return (
    <span className={frameClass}>
      {src ? (
        <img src={src} alt="" className={imageClass} />
      ) : (
        <span className={placeholderClass} aria-hidden="true" />
      )}
    </span>
  )
}
