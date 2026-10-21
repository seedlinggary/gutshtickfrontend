import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Play, Image as ImageIcon } from 'lucide-react';

const CATEGORY_LABEL = {
  parsha: 'Parsha', halacha: 'Halacha', mussar: 'Mussar', stories: 'Stories', holidays: 'Holidays', other: 'Other',
};

export default function PostCard({ post }) {
  const thumb = post.post_type === 'video' && post.youtube_video_id
    ? `https://img.youtube.com/vi/${post.youtube_video_id}/mqdefault.jpg`
    : post.cover_photo_url;

  return (
    <Link to={`/posts/${post.slug}`} className="tor-post-card">
      {thumb ? (
        <img src={thumb} alt={post.title} className="tor-post-card-img" />
      ) : (
        <div className="tor-post-card-img tor-post-card-img-placeholder">
          {post.post_type === 'video' ? <Play size={28} /> : post.post_type === 'image' ? <ImageIcon size={28} /> : <BookOpen size={28} />}
        </div>
      )}
      <div className="tor-post-card-badge">{CATEGORY_LABEL[post.category] || post.category}</div>
      <div className="tor-post-card-body">
        <h3>{post.title}</h3>
        {post.excerpt && <p>{post.excerpt}</p>}
      </div>
    </Link>
  );
}
