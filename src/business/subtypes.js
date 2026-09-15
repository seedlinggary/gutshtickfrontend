// Starter "type" suggestions per top-level category (e.g. a restaurant being
// Dairy/Meat/Pizza/Fine Dining/...), shown as quick-pick chips in
// TypeTagPicker. A business can pick any number of these and/or type a
// custom one that isn't listed -- these are just a starting point, not a
// closed set. Categories not listed here still allow typing a custom tag;
// they simply have no pre-filled suggestions yet. Easy to extend: just add
// or edit entries below, no migration or backend change needed since these
// are stored as free strings in Business.attributes.types.
export const SUBTYPE_SUGGESTIONS = {
  restaurant: [
    'Dairy', 'Meat', 'Pizza', 'Dessert/Bakery', 'Fine Dining (Meat)',
    'Fine Dining (Dairy)', 'Sushi/Japanese', 'Middle Eastern', 'Cafe/Coffee',
    'Food Truck', 'Catering', 'Fast Food/Takeout',
  ],
  grocery: ['Supermarket', 'Butcher', 'Bakery', 'Fish Market', 'Wine & Liquor', 'Specialty/Gourmet'],
  retail: ['Judaica', 'Clothing', 'Jewelry', 'Gifts', 'Books/Seforim', 'Furniture'],
  health_beauty: ['Wig/Sheitel Salon', 'Hair Salon', 'Spa', 'Barber', 'Nail Salon', 'Makeup'],
  professional_services: ['Accounting', 'Legal', 'Insurance', 'Real Estate', 'Travel Agency', 'Event Planning'],
  home_services: ['Plumbing', 'Electrical', 'Cleaning', 'Contracting', 'Moving', 'Landscaping'],
  entertainment: ['Simcha Hall', 'Photography/Videography', 'DJ/Music', 'Party Rental'],
  automotive: ['Repair Shop', 'Dealership', 'Detailing', 'Towing'],
};
