import 'server-only'
import type { Email } from './send'

// BRAND.md "Email" (p.45): 600 px, black header with the centred white logo, Arial, one cyan CTA,
// Gunmetal footer. Email HTML can't use CSS tokens, so the hex values come from BRAND.md.
const COLOURS = { black: '#111111', cyan: '#00A4C7', gunmetal: '#303030', white: '#FFFFFF' }
const FONT = 'Arial, Helvetica, sans-serif'
const PHONE = '1300 780 141'

const escape = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/**
 * "You're Carbon Certified" (BRAND.md microcopy). The first name and a link only: never the
 * address, surname, certificate number or the PDF itself (T-43). Body copy is a draft awaiting
 * Rich's approval (brand p.69).
 */
export function certificateIssuedEmail(input: {
  to: string
  firstName: string
  siteUrl: string
  companyAddress: string
}): Email {
  const name = escape(input.firstName)
  const dashboard = `${input.siteUrl}/dashboard`
  const logo = `${input.siteUrl}/brand/logo-full-white-on-black-transparent-email.png`
  const footer = `Carbon Offroad | KPD Industries Pty Ltd | ${input.companyAddress} | ${PHONE}`
  const html = `<!doctype html><html lang="en-AU"><body style="margin:0;background:${COLOURS.white}">
<span style="display:none">Your certificate is ready to download.</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">
<tr><td align="center" style="background:${COLOURS.black};padding:24px">
<a href="${input.siteUrl}"><img src="${logo}" width="200" alt="Carbon Offroad" style="display:block;border:0"></a></td></tr>
<tr><td style="padding:32px 24px;font-family:${FONT};color:${COLOURS.black}">
<h1 style="margin:0 0 16px;font-size:28px;font-weight:bold">You're Carbon Certified</h1>
<p style="margin:0 0 24px;font-size:16px;line-height:1.5">Hi ${name}, you've passed every core lesson. Your certificate is ready to download from your dashboard.</p>
<a href="${dashboard}" style="display:inline-block;background:${COLOURS.cyan};color:${COLOURS.black};font-weight:bold;text-transform:uppercase;text-decoration:none;padding:14px 28px;border-radius:9999px;min-height:44px">VIEW YOUR CERTIFICATE</a>
</td></tr>
<tr><td style="background:${COLOURS.gunmetal};color:${COLOURS.white};padding:16px 24px;font-family:${FONT};font-size:13px;line-height:1.5">${escape(footer)}</td></tr>
</table></td></tr></table></body></html>`
  const text = `You're Carbon Certified

Hi ${input.firstName}, you've passed every core lesson. Your certificate is ready to download from your dashboard:
${dashboard}

${footer}`
  return {
    to: input.to,
    subject: "You're Carbon Certified",
    html,
    text,
    template: 'certificate_issued',
  }
}
