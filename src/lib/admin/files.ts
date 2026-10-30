/** YYYYMMDD in Brisbane time, for file names (BRAND p.50 naming). */
export function brisbaneDate(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Australia/Brisbane',
  })
    .format(now)
    .replaceAll('-', '')
}

/** CarbonOffroad_Report-CertifiedStaff_v1_20261030.csv */
export function reportFilename(name: string, now = new Date()): string {
  return `CarbonOffroad_Report-${name}_v1_${brisbaneDate(now)}.csv`
}

/** CarbonOffroad_QR-winch-fitting_v1_20261030.svg */
export function qrFilename(slug: string, now = new Date()): string {
  return `CarbonOffroad_QR-${slug}_v1_${brisbaneDate(now)}.svg`
}
