export default function PhotoFeedStories({ stories, onSelectStory }) {
  if (stories.length === 0) return null

  return (
    <div className="photo-feed-stories-wrap">
      <div className="photo-feed-stories" role="list" aria-label="Table stories">
        {stories.map((story, index) => (
          <button
            key={story.id}
            type="button"
            className="photo-feed-stories-item"
            role="listitem"
            onClick={() => onSelectStory(index)}
            aria-label={`View ${story.name} photos, ${story.photos.length} ${
              story.photos.length === 1 ? 'photo' : 'photos'
            }`}
          >
            <span className="photo-feed-stories-ring">
              <span className="photo-feed-stories-thumb">
                <img src={story.coverPhoto.public_url} alt="" />
              </span>
            </span>
            <span className="photo-feed-stories-label">{story.name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
