export function skillRegex(skill: string, flags = 'gi'): RegExp {
  const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(?<![A-Za-z0-9])${escaped}(?![A-Za-z0-9])`, flags)
}
