export function toIdentifier(string: string): string {
  return Array.from(string.matchAll(/([a-z]+)|([A-Z][a-z]+)|([A-Z]+(?![a-z]))|\d+/g))
    .map(match => match[0])
    .map((word, index) => {
      if (index === 0) {
        return word.charAt(0).toLowerCase() + word.slice(1).toLowerCase()
      } else {
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      }
    })
    .join("")
}
