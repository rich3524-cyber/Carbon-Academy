import 'server-only'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import fontkit from '@pdf-lib/fontkit'
import { PDFDocument, rgb } from 'pdf-lib'
import { displayDate } from './format'
import { LOGO_PATHS, LOGO_VIEWBOX } from './logo-paths'

const MM = 72 / 25.4
const PAGE = { width: 297 * MM, height: 210 * MM } // A4 landscape [Approved] (BRAND.md)
const MARGIN = 20 * MM
// BRAND.md colour tokens as RGB fractions (the brand guard bans raw hex in source).
const BLACK = rgb(17 / 255, 17 / 255, 17 / 255) // carbon-black
const CYAN = rgb(0, 164 / 255, 199 / 255) // carbon-cyan: the one accent rule
const GUNMETAL = rgb(48 / 255, 48 / 255, 48 / 255)

export type CertificateForPdf = {
  certificateNumber: string
  checkCode: string
  firstName: string
  lastName: string
  storeName: string
  issuedAt: string
  expiresAt: string
  verifyUrl: string
}

const fontDir = join(process.cwd(), 'src/lib/certificates/fonts')

export async function buildCertificatePdf(c: CertificateForPdf): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  pdf.registerFontkit(fontkit)
  pdf.setTitle(`Carbon Certified certificate ${c.certificateNumber}`) // BRAND.md: title property
  pdf.setAuthor('Carbon Offroad')
  pdf.setCreator('Carbon Offroad Academy')
  const [regular, bold] = await Promise.all([
    readFile(join(fontDir, 'Arimo-Regular.ttf')).then((b) => pdf.embedFont(b, { subset: true })),
    readFile(join(fontDir, 'Arimo-Bold.ttf')).then((b) => pdf.embedFont(b, { subset: true })),
  ])
  const page = pdf.addPage([PAGE.width, PAGE.height])
  const top = PAGE.height - MARGIN

  // Full logo, black, top left, about 100 mm wide (30–40% of the page, p.22). Vector paths.
  const logoWidth = 100 * MM
  const scale = logoWidth / LOGO_VIEWBOX.width
  for (const d of LOGO_PATHS) page.drawSvgPath(d, { x: MARGIN, y: top, scale, color: BLACK })

  let y = top - LOGO_VIEWBOX.height * scale - 24 * MM
  page.drawText('CARBON CERTIFIED', { x: MARGIN, y, size: 32, font: bold, color: BLACK }) // H1
  y -= 7 * MM
  page.drawRectangle({ x: MARGIN, y, width: 50 * MM, height: 1.5 * MM, color: CYAN }) // one rule
  y -= 16 * MM
  page.drawText(`${c.firstName} ${c.lastName}`, {
    x: MARGIN,
    y,
    size: 22,
    font: bold,
    color: BLACK,
  }) // H2
  y -= 10 * MM
  page.drawText('has completed every core lesson in the Carbon Offroad Academy.', {
    x: MARGIN,
    y,
    size: 11,
    font: regular,
    color: BLACK,
  })
  y -= 7 * MM
  page.drawText(c.storeName, { x: MARGIN, y, size: 11, font: bold, color: BLACK })
  y -= 14 * MM
  const label = (text: string, x: number) =>
    page.drawText(text, { x, y, size: 8.5, font: regular, color: GUNMETAL })
  const value = (text: string, x: number) =>
    page.drawText(text, { x, y: y - 5 * MM, size: 11, font: bold, color: BLACK })
  label('Issued', MARGIN)
  value(displayDate(c.issuedAt), MARGIN)
  label('Expires', MARGIN + 60 * MM)
  value(displayDate(c.expiresAt), MARGIN + 60 * MM)
  label('Certificate', MARGIN + 120 * MM)
  value(c.certificateNumber, MARGIN + 120 * MM)

  page.drawText(`Check this certificate at ${c.verifyUrl}`, {
    x: MARGIN,
    y: MARGIN + 12 * MM,
    size: 9,
    font: regular,
    color: BLACK,
  })
  page.drawText(
    'Carbon Offroad | KPD Industries Pty Ltd | ABN 80 142 983 382 | 1300 780 141 | carbonoffroad.com.au',
    {
      x: MARGIN,
      y: MARGIN,
      size: 8,
      font: regular,
      color: GUNMETAL,
    },
  )
  return pdf.save()
}
