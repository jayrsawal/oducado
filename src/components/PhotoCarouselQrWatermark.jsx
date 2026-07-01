import { QRCodeSVG } from 'qrcode.react'
import { appPageUrl } from './PageQRCode'

const WALL_PATH = '/photos/wall'

export default function PhotoCarouselQrWatermark({ fullscreen = false }) {
  const size = fullscreen ? 104 : 76

  return (
    <div className="photo-carousel-qr-watermark" aria-hidden="true">
      <QRCodeSVG
        value={appPageUrl(WALL_PATH)}
        size={size}
        bgColor="#000000"
        fgColor="#ffffff"
        level="H"
      />
    </div>
  )
}
