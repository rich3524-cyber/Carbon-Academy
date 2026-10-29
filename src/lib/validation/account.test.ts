import { describe, expect, it } from 'vitest'
import { Email, JoinInput, PersonName, SignInInput, StoreCode } from './account'

describe('Email', () => {
  it('trims and lower-cases', () => {
    expect(Email.parse('  Pat@Example.COM ')).toBe('pat@example.com')
  })
  it.each([
    '',
    'not-an-email',
    'a@b',
    `${'a'.repeat(250)}@example.com`,
    'pat@example.com\r\nBcc: x@y.z',
  ])('rejects %j', (value) => {
    expect(Email.safeParse(value).success).toBe(false)
  })
})

describe('PersonName', () => {
  it.each(["O'Brien", 'Anne-Marie', 'José', 'Ngô Thị', 'St. John'])('accepts %s', (value) => {
    expect(PersonName.parse(` ${value} `)).toBe(value)
  })
  it.each(['', ' ', '<script>', 'x'.repeat(51), 'Robert"); DROP', 'a\u0000b'])(
    'rejects %j',
    (value) => {
      expect(PersonName.safeParse(value).success).toBe(false)
    },
  )
})

describe('StoreCode', () => {
  it('normalises case and whitespace', () => {
    expect(StoreCode.parse(' tst-rob-7k2q9mxh ')).toBe('TST-ROB-7K2Q9MXH')
  })
  it.each(['TST-ROB-7K2Q', 'TST-ROB-7K2Q9MXI', 'TSTROB7K2Q9M', "x' or 1=1", 'A'.repeat(41)])(
    'rejects %j',
    (value) => {
      expect(StoreCode.safeParse(value).success).toBe(false)
    },
  )
})

describe('form inputs', () => {
  it('reads the sign-in form, with an empty honeypot', () => {
    expect(SignInInput.parse({ email: 'pat@example.com', website: '' })).toEqual({
      email: 'pat@example.com',
      website: '',
    })
  })

  it('reads the join form and turns the checkbox into a boolean', () => {
    const parsed = JoinInput.parse({
      firstName: 'Pat',
      lastName: 'Lee',
      email: 'pat@example.com',
      marketingOptIn: 'on',
      code: 'tst-rob-7k2q9mxh',
      website: '',
    })
    expect(parsed).toEqual({
      firstName: 'Pat',
      lastName: 'Lee',
      email: 'pat@example.com',
      marketingOptIn: true,
      code: 'TST-ROB-7K2Q9MXH',
      website: '',
    })
  })

  it('treats a missing checkbox as no consent, and a missing code as a customer', () => {
    const parsed = JoinInput.parse({
      firstName: 'Pat',
      lastName: 'Lee',
      email: 'pat@example.com',
      website: '',
    })
    expect(parsed.marketingOptIn).toBe(false)
    expect(parsed.code).toBeUndefined()
  })

  it('drops unknown fields, so a role or store id can never be passed through (mass assignment)', () => {
    const parsed = JoinInput.parse({
      firstName: 'Pat',
      lastName: 'Lee',
      email: 'pat@example.com',
      website: '',
      role: 'admin',
      store_id: 'x',
    })
    expect(parsed).not.toHaveProperty('role')
    expect(parsed).not.toHaveProperty('store_id')
  })
})
