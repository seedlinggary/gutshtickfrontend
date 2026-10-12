import React from 'react';
import { Tag, Sparkles, BellRing, CalendarDays, Megaphone, FileText } from 'lucide-react';
import { POST_TYPE_META } from './categories';

const ICONS = { Tag, Sparkles, BellRing, CalendarDays, Megaphone, FileText };

export default function PostTypeIcon({ postType, size = 14, ...rest }) {
  const name = (POST_TYPE_META[postType] || POST_TYPE_META.other).iconName;
  const Cmp = ICONS[name] || FileText;
  return <Cmp size={size} strokeWidth={2} {...rest} />;
}
