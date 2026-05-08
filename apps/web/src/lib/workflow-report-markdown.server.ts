export function parseSection(markdown: string, heading: string) {
  const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = markdown.match(
    new RegExp(`## ${escapedHeading}\\n([\\s\\S]*?)(?:\\n---\\n|\\n## |$)`),
  )

  return match?.[1]?.trim() ?? ''
}

export function parseSectionBullets(markdown: string, heading: string) {
  const body = parseSection(markdown, heading)
  return body
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- '))
    .map((line) => line.slice(2).trim())
}

export function parseSectionParagraph(markdown: string, heading: string) {
  return parseSection(markdown, heading)
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('- '))
    .join(' ')
    .trim()
}
