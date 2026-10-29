import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
const log = vi.fn()
vi.mock('@/lib/log', () => ({ logSecurityEvent: (...args: unknown[]) => log(...args) }))
const { certificateIssuedEmail } = await import('./certificate')
const { sendEmail } = await import('./send')

const input = {
  to: 'pat.sample@example.com',
  firstName: 'Pat',
  siteUrl: 'https://academy.example.com',
  companyAddress: 'Unit 1a, 1 Waterway Drive, Coomera QLD 4209',
}

describe('certificate email (BRAND.md Email, p.45; T-43)', () => {
  it('has a short subject, one CTA to the dashboard, the logo and a full footer', () => {
    const email = certificateIssuedEmail(input)
    expect(email.subject).toBe("You're Carbon Certified")
    expect(email.subject.length).toBeLessThan(45)
    expect(email.html).toContain('href="https://academy.example.com/dashboard"')
    expect(email.html).toContain('VIEW YOUR CERTIFICATE')
    expect(email.html).toMatch(
      /<img[^>]+logo-full-white-on-black-transparent-email\.png[^>]+width="200"[^>]+alt="Carbon Offroad"/,
    )
    for (const part of ['KPD Industries Pty Ltd', input.companyAddress, '1300 780 141']) {
      expect(email.html).toContain(part)
      expect(email.text).toContain(part)
    }
    expect(email.text).toContain('https://academy.example.com/dashboard')
  })

  it('escapes the first name', () => {
    const email = certificateIssuedEmail({ ...input, firstName: '<b>Pat</b>' })
    expect(email.html).toContain('&lt;b&gt;Pat&lt;/b&gt;')
    expect(email.html).not.toContain('<b>Pat</b>')
  })

  it('carries no email address, surname or certificate number in the body', () => {
    const email = certificateIssuedEmail(input)
    expect(email.html).not.toContain(input.to)
    expect(email.text).not.toContain(input.to)
    expect(email.html).not.toMatch(/COA-\d{4}/)
  })
})

describe('sendEmail (no provider until PRD D5)', () => {
  it('sends nothing and logs the template name only, never the address', async () => {
    const result = await sendEmail(certificateIssuedEmail(input))
    expect(result).toEqual({ sent: false })
    expect(log).toHaveBeenCalledWith('email_skipped', { code: 'certificate_issued' })
    expect(JSON.stringify(log.mock.calls)).not.toContain(input.to)
  })
})
