const RULES = [
  { genre: 'deal', label: 'Ticket', match: /deal|shopping|amazon|sale|discount/i },
  { genre: 'news', label: 'Clipping', match: /news|travel|points|israel/i },
  { genre: 'joke', label: 'Index card', match: /joke|funny|humor/i },
];

/**
 * Maps a Shtick's category name(s) to a card "genre" -- the visual
 * treatment (see .genre-* in index.css) that makes a joke, a deal, and a
 * news item read as different kinds of things at a glance instead of
 * identical white cards. Falls back to 'joke' (the site's most common
 * content type) rather than a neutral/ungenred card, so every post still
 * gets a genre-true treatment.
 */
export function cardGenre(post) {
  const names = (post?.categories?.length ? post.categories : post?.generalc ? [post.generalc] : [])
    .map((c) => c?.name || '')
    .join(' ');
  const haystack = `${names} ${post?.specific_category || ''}`;
  for (const rule of RULES) {
    if (rule.match.test(haystack)) return rule;
  }
  return { genre: 'joke', label: 'Index card' };
}

export default cardGenre;
