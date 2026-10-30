import { z } from 'zod'
import { safeHttpsUrl, WARRANTY_HOSTS } from '@/lib/validation/urls'

// Security framework control 05/06: every admin Server Action parses its form with these.
// The limits mirror the admin_* functions in the Phase 6 migration exactly; the database
// checks them again. z.object strips unknown keys.

const required = (max: number, what: string) =>
  z.string().trim().min(1, `Enter ${what}.`).max(max, `Keep it to ${max} characters.`)

const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Keep it to ${max} characters.`)
    .optional()
    .transform((value) => value || null)

const checkbox = z
  .string()
  .optional()
  .transform((value) => value === 'on')

/** '' (a new record) or an existing ID. */
const optionalId = z
  .union([z.uuid(), z.literal('')])
  .optional()
  .transform((value) => value || null)

export const Slug = z
  .string()
  .trim()
  .toLowerCase()
  .max(80, 'Keep it to 80 characters.')
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Use lower case letters, numbers and single hyphens.')

/** Whole numbers from a form field, within a range. */
const wholeNumber = (min: number, max: number) =>
  z
    .string()
    .trim()
    .regex(/^\d{1,5}$/, 'Enter a whole number.')
    .transform(Number)
    .refine((value) => value >= min && value <= max, `Between ${min} and ${max}.`)

export const CategoryInput = z.object({
  id: optionalId,
  slug: Slug,
  name: required(80, 'a name'),
  description: optional(300),
})

export const LessonInput = z.object({
  id: optionalId,
  category: z.uuid('Choose a category.'),
  slug: Slug,
  title: required(120, 'a title'),
  summary: optional(500),
  productName: optional(120),
  vimeoId: z
    .string()
    .trim()
    .regex(/^(\d{6,12})?$/, 'Vimeo IDs are 6 to 12 digits.')
    .transform((value) => value || null),
  duration: z
    .string()
    .trim()
    .regex(/^(\d{1,5})?$/, 'Enter the length in whole seconds.')
    .transform((value) => (value ? Number(value) : null))
    .refine((value) => value === null || (value >= 1 && value <= 36000), 'Between 1 and 36000.'),
  region: z.enum(['AU', 'US', 'ALL']),
  isCore: checkbox,
  published: checkbox,
})

export const MoveInput = z.object({
  id: z.uuid(),
  direction: z.enum(['-1', '1']).transform(Number),
})

const QuizOption = z.object({
  text: z.string().trim().min(1, 'Every option needs text.').max(200, 'Options: 200 characters.'),
  correct: z.boolean(),
})
const QuizQuestion = z
  .object({
    prompt: z
      .string()
      .trim()
      .min(1, 'Every question needs text.')
      .max(300, 'Questions: 300 characters.'),
    options: z
      .array(QuizOption)
      .min(3, 'Each question needs 3 or 4 options.')
      .max(4, 'Each question needs 3 or 4 options.'),
  })
  .refine((q) => q.options.filter((o) => o.correct).length === 1, {
    message: 'Mark exactly one correct option for each question.',
  })

/** The quiz editor sends the whole quiz as JSON (decision 8). Rules match quiz_ready(). */
export const QuizInput = z.object({
  lessonId: z.uuid(),
  questions: z
    .string()
    .max(20_000)
    .transform((text, ctx) => {
      try {
        return JSON.parse(text) as unknown
      } catch {
        ctx.addIssue({
          code: 'custom',
          message: 'The quiz could not be read. Reload and try again.',
        })
        return z.NEVER
      }
    })
    .pipe(z.array(QuizQuestion).min(1, 'Add at least one question.').max(5, 'Up to 5 questions.')),
})

export const PartnerInput = z.object({
  id: optionalId,
  name: required(120, 'a name'),
  type: z.enum(['', 'dealer', 'retailer', 'big box']).transform((value) => value || null),
  parentGroup: optional(120),
})

const CodePart = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{2,5}$/, '2 to 5 letters.')

export const StoreInput = z.object({
  id: optionalId,
  partner: z.uuid('Choose a partner.'),
  name: required(120, 'a store name'),
  suburb: optional(80),
  state: optional(40),
  country: z.enum(['AU', 'NZ', 'US']),
  active: checkbox,
  prefix: CodePart.optional(),
  location: CodePart.optional(),
})

export const RegenerateInput = z.object({ id: z.uuid(), prefix: CodePart, location: CodePart })

export const QrLinkInput = z.object({
  id: optionalId,
  slug: Slug,
  lesson: z.uuid('Choose a lesson.'),
})

export const SearchInput = z.object({
  q: z.string().trim().min(2, 'Enter at least 2 characters.').max(100),
})

export const LearnerStoreInput = z.object({
  id: z.uuid(),
  store: z.union([z.uuid(), z.literal('')]).transform((value) => value || null),
})

export const LearnerIdInput = z.object({ id: z.uuid() })
export const RoleInput = z.object({ id: z.uuid(), role: z.enum(['learner', 'admin']) })
export const ActiveInput = z.object({
  id: z.uuid(),
  active: z.enum(['true', 'false']).transform((v) => v === 'true'),
})
export const RevokeInput = z.object({
  certificate: z.uuid(),
  learner: z.uuid(),
  reason: z.string().trim().min(3, 'Give a short reason.').max(300, 'Keep it to 300 characters.'),
})
export const ReinstateInput = z.object({ certificate: z.uuid(), learner: z.uuid() })
export const DeleteLearnerInput = z.object({ id: z.uuid(), confirmName: z.string().max(110) })

export const SettingsInput = z.object({
  passMark: wholeNumber(50, 100),
  threshold: wholeNumber(1, 20),
  validityMonths: wholeNumber(1, 36),
  renewalDays: wholeNumber(1, 90),
  attemptsPerHour: wholeNumber(1, 20),
  warrantyUrl: z
    .string()
    .trim()
    .max(300)
    .transform((value, ctx) => {
      if (!value) return null
      const safe = safeHttpsUrl(value, WARRANTY_HOSTS)
      if (!safe) {
        ctx.addIssue({ code: 'custom', message: 'Use an https link on carbonoffroad.com.au.' })
        return z.NEVER
      }
      return safe
    }),
  companyAddress: required(200, 'the company address'),
})

export const REPORTS = [
  'completions',
  'certified-stores',
  'certified-staff',
  'qr-scans',
  'audit',
] as const
export type Report = (typeof REPORTS)[number]
export const ReportName = z.enum(REPORTS)

/** A YYYY-MM-DD date from a date input. */
export const DateInput = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
