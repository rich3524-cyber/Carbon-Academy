import { z } from 'zod'

/** Quiz answers from the browser (control 05). The database checks them again (T-33). */
const Id = z.uuid().transform((id) => id.toLowerCase())

export const QuizLessonId = Id

export const QuizSubmission = z.object({
  lessonId: Id,
  answers: z
    .record(z.uuid(), Id)
    .refine((a) => Object.keys(a).length >= 1 && Object.keys(a).length <= 10)
    .transform((a) => Object.fromEntries(Object.entries(a).map(([q, o]) => [q.toLowerCase(), o]))),
})

export type QuizSubmission = z.infer<typeof QuizSubmission>
