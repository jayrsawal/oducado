import AdminPageQRCodes from './AdminPageQRCodes'

const WALL_PATH = '/photos/wall'

export default function AdminPhotoQRCodes({ albumTitle }) {
  return (
    <AdminPageQRCodes
      path={WALL_PATH}
      title={albumTitle?.trim() || 'Photo feed'}
      description="One code for the whole reunion — guests open the feed, share photos, and optionally tag a table or poll option for story rings."
      fileNameBase="photo-feed-qr-code"
      maximizeLabel="Maximize photo feed QR code"
    />
  )
}
