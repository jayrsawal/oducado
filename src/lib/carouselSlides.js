export const POLL_CTA_SLIDE_ID = '__poll-cta__'
export const PHOTO_CTA_SLIDE_ID = '__upload-cta__'

function randomInt(min, max) {
  if (max < min) return min
  return min + Math.floor(Math.random() * (max - min + 1))
}

function nextAdGap(interval, photosLeft) {
  const maxGap = Math.max(1, Math.min(interval + 1, photosLeft))
  const minGap = Math.max(1, Math.min(interval - 2, maxGap))
  return randomInt(minGap, maxGap)
}

export function buildCarouselSlides(photos, poll, adEveryPhotos = 7) {
  const photoSlides = [...photos]
    .filter((photo) => photo.media_type !== 'video')
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .map((photo) => ({ ...photo, type: 'photo' }))

  const adTemplates = []
  if (poll) {
    adTemplates.push({ id: POLL_CTA_SLIDE_ID, type: 'poll-cta' })
  }
  adTemplates.push({ id: PHOTO_CTA_SLIDE_ID, type: 'cta' })

  if (photoSlides.length === 0) {
    return adTemplates
  }

  if (adTemplates.length === 0) {
    return photoSlides
  }

  const interval = Math.max(4, adEveryPhotos)
  const result = []
  let photosSinceAd = 0
  let photosLeft = photoSlides.length
  let nextAdAt = nextAdGap(interval, photosLeft)
  let adInsertCount = 0

  for (const photo of photoSlides) {
    result.push(photo)
    photosSinceAd += 1
    photosLeft -= 1

    if (photosSinceAd >= nextAdAt) {
      const ad = adTemplates[adInsertCount % adTemplates.length]
      result.push({
        ...ad,
        id: `${ad.id}--${adInsertCount}`,
      })
      adInsertCount += 1
      photosSinceAd = 0
      nextAdAt = nextAdGap(interval, photosLeft)
    }
  }

  if (adInsertCount === 0) {
    const ad = adTemplates[adInsertCount % adTemplates.length]
    const insertAt = randomInt(1, result.length)
    result.splice(insertAt, 0, {
      ...ad,
      id: `${ad.id}--${adInsertCount}`,
    })
  }

  return result
}
