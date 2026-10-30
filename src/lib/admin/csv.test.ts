import { describe, expect, it } from 'vitest'
import { neutralise, toCsv } from './csv'
import { brisbaneDate, qrFilename, reportFilename } from './files'

describe('neutralise (ASVS 1.2.10, T-50)', () => {
  it.each(['=HYPERLINK("http://x")', '+61 7 5555', '-2+3', '@SUM(A1)', '\tcmd', '\rcmd', '\0x'])(
    'prefixes %j with an apostrophe',
    (value) => {
      expect(neutralise(value)).toBe(`'${value}`)
    },
  )

  it('leaves ordinary text alone, including = later in the cell', () => {
    for (const value of ['Robina', 'a=b', "Pat O'Neil", '']) expect(neutralise(value)).toBe(value)
  })
})

describe('toCsv', () => {
  const columns = [
    { header: 'Name', value: (r: { name: string; n: number | null }) => r.name },
    { header: 'Count', value: (r: { name: string; n: number | null }) => r.n },
  ]

  it('starts with a byte-order mark and ends lines with CRLF', () => {
    const csv = toCsv([{ name: 'Robina', n: 2 }], columns)
    expect(csv.startsWith('﻿')).toBe(true)
    expect(csv).toBe('﻿"Name","Count"\r\n"Robina","2"\r\n')
  })

  it('quotes every field, doubles quotes and keeps commas and newlines inside quotes', () => {
    const csv = toCsv([{ name: 'Say "hi", then\nleave', n: null }], columns)
    expect(csv).toContain('"Say ""hi"", then\nleave",""')
  })

  it('neutralises text but not numbers', () => {
    const csv = toCsv([{ name: '=1+1', n: -1 }], columns)
    expect(csv).toContain(`"'=1+1","-1"`)
  })
})

describe('file names (BRAND p.50)', () => {
  it('uses the Brisbane date, which rolls over at 14:00 UTC', () => {
    expect(brisbaneDate(new Date('2026-10-30T13:59:00Z'))).toBe('20261030')
    expect(brisbaneDate(new Date('2026-10-30T14:00:00Z'))).toBe('20261031')
  })

  it('names reports and QR codes the house way', () => {
    const at = new Date('2026-10-30T01:00:00Z')
    expect(reportFilename('CertifiedStaff', at)).toBe(
      'CarbonOffroad_Report_CertifiedStaff_v1_20261030.csv',
    )
    expect(qrFilename('winch-fitting', at)).toBe('CarbonOffroad_QR_winch-fitting_v1_20261030.svg')
  })
})
