import React from 'react';
import { MapPin, Truck, Globe2 } from 'lucide-react';
import { LOCATION_TYPE_META } from './categories';

const ICONS = { MapPin, Truck, Globe2 };

export default function LocationTypeIcon({ type, size = 13, ...rest }) {
  const name = (LOCATION_TYPE_META[type] || LOCATION_TYPE_META.physical).icon;
  const Cmp = ICONS[name] || MapPin;
  return <Cmp size={size} {...rest} />;
}
