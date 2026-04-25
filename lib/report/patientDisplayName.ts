export function cleanPatientNamePart(value: string | null | undefined) {
  if (!value) return 'Unknown'
  const cleaned = value.replace(/\d+/g, '').trim()
  return cleaned || value
}

export function buildPatientDisplayName(firstName: string | null | undefined, lastName: string | null | undefined) {
  const cleanFirstName = cleanPatientNamePart(firstName)
  const cleanLastName = cleanPatientNamePart(lastName)

  return {
    firstName: cleanFirstName,
    lastName: cleanLastName,
    displayName: `${cleanFirstName} ${cleanLastName}`.trim(),
  }
}
