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

/** CarbonOffroad_Report_CertifiedStaff_v1_20261030.csv (underscores between fields, p.50) */
export function reportFilename(name: string, now = new Date()): string {
  return `CarbonOffroad_Report_${name}_v1_${brisbaneDate(now)}.csv`
}

/** CarbonOffroad_QR_winch-fitting_v1_20261030.svg */
export function qrFilename(slug: string, now = new Date()): string {
  return `CarbonOffroad_QR_${slug}_v1_${brisbaneDate(now)}.svg`
}
