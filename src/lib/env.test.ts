import { describe, expect, it } from 'vitest'
import { required } from './env'

describe('required', () => {
  it('returns the value when it is set', () => {
    expect(required('https://example.supabase.co', 'NEXT_PUBLIC_SUPABASE_URL')).toBe(
      'https://example.supabase.co',
    )
  })

  it('throws a message naming the missing variable', () => {
    expect(() => required(undefined, 'NEXT_PUBLIC_SUPABASE_URL')).toThrow(
      'Missing environment variable NEXT_PUBLIC_SUPABASE_URL. See .env.example.',
    )
  })

  it('treats an empty string as missing', () => {
    expect(() => required('', 'NEXT_PUBLIC_SUPABASE_URL')).toThrow('NEXT_PUBLIC_SUPABASE_URL')
  })
})
