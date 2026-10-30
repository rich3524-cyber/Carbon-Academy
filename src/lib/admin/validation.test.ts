import { describe, expect, it } from 'vitest'
import {
  LessonInput,
  PartnerInput,
  QuizInput,
  RegenerateInput,
  SettingsInput,
  StoreInput,
} from './validation'

// The limits mirror the admin_* functions (Phase 6 migration); the database checks them again.

const lesson = {
  id: '',
  category: '2b1f0d5e-3c4a-4b6d-9e8f-0a1b2c3d4e5f',
  slug: 'Winch-Fitting',
  title: ' Winch fitting ',
  summary: '',
  productName: '',
  vimeoId: '76979871',
  duration: '62',
  region: 'AU',
}

describe('LessonInput', () => {
  it('normalises a good lesson: lower-case slug, trimmed text, blanks to null, checkboxes', () => {
    expect(LessonInput.parse({ ...lesson, isCore: 'on' })).toEqual({
      id: null,
      category: lesson.category,
      slug: 'winch-fitting',
      title: 'Winch fitting',
      summary: null,
      productName: null,
      vimeoId: '76979871',
      duration: 62,
      region: 'AU',
      isCore: true,
      published: false,
    })
  })

  it('takes a blank length and Vimeo ID as none', () => {
    const parsed = LessonInput.parse({ ...lesson, vimeoId: '', duration: '' })
    expect(parsed.vimeoId).toBeNull()
    expect(parsed.duration).toBeNull()
  })

  it.each([
    ['slug', 'two--hyphens'],
    ['slug', 'a'.repeat(81)],
    ['title', ''],
    ['title', 'x'.repeat(121)],
    ['summary', 'x'.repeat(501)],
    ['vimeoId', '12345'],
    ['vimeoId', '76979871/abc'],
    ['duration', '0'],
    ['duration', '36001'],
    ['duration', '62.5'],
    ['region', 'EU'],
    ['category', 'not-a-uuid'],
  ])('refuses %s = %s', (field, value) => {
    expect(LessonInput.safeParse({ ...lesson, [field]: value }).success).toBe(false)
  })

  it('accepts the boundaries', () => {
    expect(
      LessonInput.safeParse({ ...lesson, title: 'x'.repeat(120), duration: '36000' }).success,
    ).toBe(true)
    expect(LessonInput.safeParse({ ...lesson, slug: 'a'.repeat(80), duration: '1' }).success).toBe(
      true,
    )
  })
})

describe('QuizInput (rules match quiz_ready)', () => {
  const question = (correct = 1, options = 3) => ({
    prompt: 'Which bolt?',
    options: Array.from({ length: options }, (_, i) => ({
      text: `Option ${i}`,
      correct: i < correct,
    })),
  })
  const quiz = (questions: unknown) => ({
    lessonId: lesson.category,
    questions: JSON.stringify(questions),
  })

  it('accepts 1 to 5 questions with 3 or 4 options and one correct', () => {
    expect(QuizInput.safeParse(quiz([question()])).success).toBe(true)
    expect(QuizInput.safeParse(quiz(Array.from({ length: 5 }, () => question(1, 4)))).success).toBe(
      true,
    )
  })

  it.each([
    ['no questions', []],
    ['six questions', Array.from({ length: 6 }, () => question())],
    ['no correct option', [question(0)]],
    ['two correct options', [question(2)]],
    ['two options', [question(1, 2)]],
    ['five options', [question(1, 5)]],
    ['an empty prompt', [{ ...question(), prompt: ' ' }]],
  ])('refuses %s', (_name, questions) => {
    expect(QuizInput.safeParse(quiz(questions)).success).toBe(false)
  })

  it('refuses JSON it cannot read', () => {
    expect(QuizInput.safeParse({ lessonId: lesson.category, questions: '{nope' }).success).toBe(
      false,
    )
  })
})

describe('partners and stores', () => {
  it('takes the three partner types or none', () => {
    for (const type of ['dealer', 'retailer', 'big box', '']) {
      expect(PartnerInput.safeParse({ name: 'BCF', type }).success).toBe(true)
    }
    expect(PartnerInput.safeParse({ name: 'BCF', type: 'online' }).success).toBe(false)
  })

  it('upper-cases code parts and needs 2 to 5 letters', () => {
    const id = lesson.category
    expect(RegenerateInput.parse({ id, prefix: 'bcf', location: 'rob' })).toEqual({
      id,
      prefix: 'BCF',
      location: 'ROB',
    })
    for (const bad of ['B', 'BCFXYZ', 'B1', 'B-C']) {
      expect(RegenerateInput.safeParse({ id, prefix: bad, location: 'ROB' }).success).toBe(false)
    }
  })

  it('needs a known country', () => {
    const store = { partner: lesson.category, name: 'Robina', country: 'AU' }
    expect(StoreInput.safeParse(store).success).toBe(true)
    expect(StoreInput.safeParse({ ...store, country: 'UK' }).success).toBe(false)
  })
})

describe('SettingsInput (ranges match setting_value_ok)', () => {
  const settings = {
    passMark: '100',
    threshold: '2',
    validityMonths: '12',
    renewalDays: '30',
    attemptsPerHour: '5',
    warrantyUrl: 'https://carbonoffroad.com.au/pages/warranty',
    companyAddress: 'Unit 1a, 1 Waterway Drive, Coomera QLD 4209',
  }

  it('accepts the current settings', () => {
    expect(SettingsInput.parse(settings)).toMatchObject({ passMark: 100, threshold: 2 })
  })

  it.each([
    ['passMark', '49', '50'],
    ['passMark', '101', '100'],
    ['threshold', '0', '1'],
    ['threshold', '21', '20'],
    ['validityMonths', '37', '36'],
    ['renewalDays', '0', '1'],
    ['renewalDays', '91', '90'],
    ['attemptsPerHour', '21', '20'],
  ])('%s: refuses %s, accepts %s', (field, bad, good) => {
    expect(SettingsInput.safeParse({ ...settings, [field]: bad }).success).toBe(false)
    expect(SettingsInput.safeParse({ ...settings, [field]: good }).success).toBe(true)
  })

  it('keeps the warranty link on carbonoffroad.com.au over https, or none', () => {
    expect(SettingsInput.parse({ ...settings, warrantyUrl: '' }).warrantyUrl).toBeNull()
    for (const bad of [
      'http://carbonoffroad.com.au/x',
      'https://evil.test/x',
      'javascript:alert(1)',
    ]) {
      expect(SettingsInput.safeParse({ ...settings, warrantyUrl: bad }).success).toBe(false)
    }
  })
})
