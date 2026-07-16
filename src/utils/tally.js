/**
 * Renders a reaction count as hash marks (‖‖‖‖ struck by /) instead of a
 * bare number next to an icon -- reads as a running count the room is
 * keeping, the way a real tally on a board would. Caps out at a plain
 * number once it's too long to read as marks (nobody wants to count to 80).
 */
export function tallyMarks(count) {
  if (!count || count <= 0) return '0';
  if (count > 20) return String(count);
  const groups = Math.floor(count / 5);
  const remainder = count % 5;
  const fives = Array.from({ length: groups }, () => '‖‖/').join(' ');
  const rest = '‖'.repeat(remainder);
  return [fives, rest].filter(Boolean).join(' ');
}

export default tallyMarks;
