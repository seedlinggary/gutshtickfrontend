// Ready-made, multi-block sections -- the single biggest time cost in
// building a page by hand is placing and positioning every block one at a
// time (confirmed firsthand recreating two real businesses' sites this
// session: dozens of manually-computed x/y/w/h values per page). A preset
// is a normal section, just pre-filled with blocks already laid out
// sensibly and already using the site's own theme for background color --
// "insert a hero" drops in one finished, editable section instead of five
// separate "add block" trips through the palette. Every string here is
// clearly-placeholder copy (same spirit as a fresh block's own default
// content), meant to be edited immediately, never shipped as-is.
//
// Each preset's `build(theme)` returns a FRESH section object (new ids via
// newBlockId) so inserting the same preset twice never collides ids.
import { newBlockId } from './blocks/blockDefs';

function blk(type, x, y, w, h, content) {
  return { id: newBlockId('block'), type, x, y, w, h, z: 0, content, mobileLayout: null };
}

function sect(blocks, { height = 420, padTop = 56, padBottom = 56, bg } = {}) {
  return {
    id: newBlockId('section'),
    background: bg ? { type: 'color', value: bg } : { type: 'color', value: 'transparent' },
    padding: { top: padTop, bottom: padBottom },
    height,
    blocks,
  };
}

export const SECTION_PRESETS = [
  {
    id: 'hero-centered',
    label: 'Hero (centered)',
    description: 'A big centered headline, subtext, and a call-to-action button.',
    build: () => sect([
      blk('text', 15, 12, 70, 14, { text: 'A Clear, Bold Headline Goes Here', fontSize: 38, align: 'center' }),
      blk('text', 20, 32, 60, 16, { text: 'One or two sentences backing up the headline -- what you do, and why it matters to the person reading this.', fontSize: 16, align: 'center', color: null }),
      blk('button', 38, 56, 24, 10, { text: 'Get Started', href: '/contact' }),
    ], { height: 420 }),
  },
  {
    id: 'hero-split',
    label: 'Hero (split with image)',
    description: 'Headline and text on one side, a photo on the other.',
    build: () => sect([
      blk('text', 4, 10, 44, 14, { text: 'A Clear, Bold Headline Goes Here', fontSize: 32, align: 'left' }),
      blk('text', 4, 30, 44, 24, { text: 'One or two sentences backing up the headline -- what you do, and why it matters to the person reading this.', fontSize: 15, align: 'left', color: null }),
      blk('button', 4, 58, 24, 10, { text: 'Get Started', href: '/contact' }),
      blk('image', 52, 6, 44, 76, { src: null, alt: '' }),
    ], { height: 460 }),
  },
  {
    id: 'features-3up',
    label: 'Features / services (3-up)',
    description: 'A heading plus three icon-and-text cards -- good for "what we do."',
    build: () => sect([
      blk('text', 4, 4, 60, 10, { text: 'What We Do', fontSize: 28, align: 'left' }),
      blk('feature_grid', 4, 18, 92, 70, {
        heading: '',
        items: [
          { icon: 'Star', title: 'First thing you offer', description: 'A short sentence about it.' },
          { icon: 'ShieldCheck', title: 'Second thing you offer', description: 'A short sentence about it.' },
          { icon: 'Zap', title: 'Third thing you offer', description: 'A short sentence about it.' },
        ],
      }),
    ], { height: 420, bg: 'var(--sb-background, #FAF3E8)' }),
  },
  {
    id: 'about-split',
    label: 'About / story',
    description: 'A heading and a couple of paragraphs, with room for a photo.',
    build: () => sect([
      blk('text', 4, 4, 45, 10, { text: 'Our Story', fontSize: 28, align: 'left' }),
      blk('text', 4, 18, 45, 70, { text: 'Tell visitors who you are and why you started -- a sentence or two about your background, then what makes the way you work different.', fontSize: 15, align: 'left', color: null }),
      blk('image', 54, 4, 42, 84, { src: null, alt: '' }),
    ], { height: 440 }),
  },
  {
    id: 'testimonials',
    label: 'Testimonials',
    description: 'A heading plus a couple of quote cards.',
    build: () => sect([
      blk('text', 4, 4, 60, 10, { text: 'What People Say', fontSize: 28, align: 'left' }),
      blk('testimonial_grid', 4, 20, 92, 65, {
        heading: '',
        items: [
          { quote: 'What a happy customer said about working with you.', author: 'Full Name', role: 'Title, Company' },
          { quote: 'Another short, specific quote about the results you got them.', author: 'Full Name', role: 'Title, Company' },
        ],
      }),
    ], { height: 380, bg: 'var(--sb-background, #FAF3E8)' }),
  },
  {
    id: 'faq',
    label: 'FAQ',
    description: 'A heading plus a few collapsible questions.',
    build: () => sect([
      blk('text', 4, 4, 60, 10, { text: 'Frequently Asked Questions', fontSize: 28, align: 'left' }),
      blk('faq_accordion', 4, 18, 70, 75, {
        heading: '',
        items: [
          { question: 'A question people actually ask you', answer: 'A clear, direct answer.' },
          { question: 'Another common question', answer: 'A clear, direct answer.' },
          { question: 'A third question', answer: 'A clear, direct answer.' },
        ],
      }),
    ], { height: 440 }),
  },
  {
    id: 'cta-banner',
    label: 'Call-to-action banner',
    description: 'A short, punchy strip with a heading and a button -- good right before the footer.',
    build: () => sect([
      blk('text', 4, 22, 55, 30, { text: 'Ready to get started?', fontSize: 26, align: 'left', color: '#ffffff' }),
      blk('button', 68, 30, 28, 14, { text: 'Contact Us', href: '/contact' }),
    ], { height: 180, padTop: 32, padBottom: 32, bg: 'var(--sb-primary, #C8553D)' }),
  },
  {
    id: 'contact',
    label: 'Contact',
    description: 'Contact details, a map, and a contact form, side by side.',
    build: () => sect([
      blk('text', 4, 4, 44, 10, { text: 'Get In Touch', fontSize: 26, align: 'left' }),
      blk('text', 4, 16, 44, 30, { text: 'Address\nYour street address here\n\nPhone\nYour phone number here', fontSize: 14, align: 'left', color: null }),
      blk('map', 4, 50, 44, 42, { address: '' }),
      blk('form', 52, 4, 44, 88, { heading: 'Send a message' }),
    ], { height: 460 }),
  },
  {
    id: 'gallery',
    label: 'Photo gallery',
    description: 'A heading plus a full-width photo gallery.',
    build: () => sect([
      blk('text', 4, 4, 60, 10, { text: 'Gallery', fontSize: 28, align: 'left' }),
      blk('gallery', 4, 18, 92, 72, { images: [] }),
    ], { height: 400 }),
  },
];
