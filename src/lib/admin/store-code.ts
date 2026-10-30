/**
 * A suggested store-code prefix from the partner's name (decision 6): the initials of up to
 * three words, or the name itself when it's one short word. Admins can change it.
 */
export function suggestPrefix(partnerName: string): string {
  const words = partnerName
    .toUpperCase()
    .replace(/[^A-Z ]/g, ' ')
    .split(' ')
    .filter((word) => word.length > 1)
  const [first] = words
  if (!first) return ''
  if (words.length === 1) return first.slice(0, 5)
  return words
    .slice(0, 3)
    .map((word) => word[0])
    .join('')
}

/** A suggested location part from the store name or suburb: its first three letters. */
export function suggestLocation(place: string): string {
  return place
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 3)
}
