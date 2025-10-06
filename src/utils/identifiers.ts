export function toIdentifier(string: string): string {
  return string
    .split(/[\s\-_]+/)
    .filter(w => w.length > 0)
    .map((word, index) => {
      if (index === 0) {
        return word.charAt(0).toLowerCase() + word.slice(1).toLowerCase()
      } else {
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      }
    })
    .join("")
}
