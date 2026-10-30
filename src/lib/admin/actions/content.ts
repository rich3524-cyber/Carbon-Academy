'use server'

import { updateTag } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/admin/access'
import { callAdmin } from '@/lib/admin/call'
import { type AdminFormState, failure, fields, invalid, saved } from '@/lib/admin/form'
import { CategoryInput, LessonInput, MoveInput, QuizInput } from '@/lib/admin/validation'
import { CACHE_TAGS } from '@/lib/content/tags'
import { vimeoDuration } from '@/lib/vimeo/oembed'

// Decision 8: categories, lessons and quizzes. The admin_* functions check access again and
// write the audit rows; updateTag makes the public pages show the change straight away.

export async function saveLesson(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin()
  const parsed = LessonInput.safeParse(fields(formData))
  if (!parsed.success) return invalid(parsed.error.issues)
  const lesson = parsed.data
  // The quiz unlock needs the length (Phase 4). Ask Vimeo when it's left blank.
  const duration = lesson.duration ?? (lesson.vimeoId ? await vimeoDuration(lesson.vimeoId) : null)
  const result = await callAdmin('admin_save_lesson', {
    p_id: lesson.id ?? null,
    p_category: lesson.category,
    p_slug: lesson.slug,
    p_title: lesson.title,
    p_summary: lesson.summary ?? null,
    p_product_name: lesson.productName ?? null,
    p_vimeo_id: lesson.vimeoId ?? null,
    p_duration_seconds: duration ?? null,
    p_is_core: lesson.isCore,
    p_region: lesson.region,
    p_published: lesson.published,
  })
  if (!result.ok) {
    if (result.error === 'duplicate') {
      return {
        ...failure('duplicate'),
        fieldErrors: { slug: 'Another lesson in this category uses that.' },
      }
    }
    return failure(result.error)
  }
  updateTag(CACHE_TAGS.content)
  if (!lesson.id) redirect(`/admin/lessons/${result.data}`)
  return saved(
    duration && !parsed.data.duration
      ? `Saved. Video length from Vimeo: ${duration} seconds.`
      : 'Saved.',
  )
}

export async function moveLesson(formData: FormData): Promise<void> {
  await requireAdmin()
  const parsed = MoveInput.safeParse(fields(formData))
  if (!parsed.success) return
  const result = await callAdmin('admin_move_lesson', {
    p_id: parsed.data.id,
    p_direction: parsed.data.direction,
  })
  if (result.ok) updateTag(CACHE_TAGS.content)
}

export async function deleteLesson(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin()
  const id = fields(formData).id ?? ''
  const result = await callAdmin('admin_delete_lesson', { p_id: id })
  if (!result.ok) {
    return failure(
      result.error,
      'Learners have progress, quiz attempts or a QR link on this lesson. Unpublish it instead.',
    )
  }
  updateTag(CACHE_TAGS.content)
  redirect('/admin/lessons')
}

export async function saveCategory(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin()
  const parsed = CategoryInput.safeParse(fields(formData))
  if (!parsed.success) return invalid(parsed.error.issues)
  const result = await callAdmin('admin_save_category', {
    p_id: parsed.data.id ?? null,
    p_slug: parsed.data.slug,
    p_name: parsed.data.name,
    p_description: parsed.data.description ?? null,
  })
  if (!result.ok) {
    if (result.error === 'duplicate') {
      return { ...failure('duplicate'), fieldErrors: { slug: 'Another category uses that.' } }
    }
    return failure(result.error)
  }
  updateTag(CACHE_TAGS.content)
  return saved()
}

export async function moveCategory(formData: FormData): Promise<void> {
  await requireAdmin()
  const parsed = MoveInput.safeParse(fields(formData))
  if (!parsed.success) return
  const result = await callAdmin('admin_move_category', {
    p_id: parsed.data.id,
    p_direction: parsed.data.direction,
  })
  if (result.ok) updateTag(CACHE_TAGS.content)
}

export async function saveQuiz(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  await requireAdmin()
  const parsed = QuizInput.safeParse(fields(formData))
  if (!parsed.success) {
    return { status: 'error', message: parsed.error.issues[0]?.message ?? 'Check the quiz.' }
  }
  const result = await callAdmin('admin_save_quiz', {
    p_lesson: parsed.data.lessonId,
    p_questions: parsed.data.questions,
  })
  if (!result.ok) return failure(result.error)
  updateTag(CACHE_TAGS.content)
  return saved('Quiz saved.')
}
