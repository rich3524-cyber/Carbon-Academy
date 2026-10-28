import 'server-only'
import { cacheLife } from 'next/cache'
import { createPublicClient } from '@/lib/supabase/public'
import { isVimeoId } from '@/lib/validation/urls'
import { type LessonLink, neighbours } from './lesson-nav'

export type LessonCardData = {
  slug: string
  title: string
  productName: string | null
  isCore: boolean
}
export type LibraryCategory = {
  slug: string
  name: string
  description: string | null
  lessons: LessonCardData[]
}
export type LessonDetail = LessonCardData & {
  summary: string | null
  vimeoId: string | null
  category: { slug: string; name: string }
  previous: LessonLink | null
  next: LessonLink | null
}

type LessonRecord = LessonCardData & { summary: string | null; vimeoId: string | null }
type CategoryRecord = Omit<LibraryCategory, 'lessons'> & { lessons: LessonRecord[] }

/**
 * Every category with its published lessons (RLS filters drafts), in display order.
 * Public content only, so it's safe in the shared 'use cache' scope (control 14).
 */
async function loadLibrary(): Promise<CategoryRecord[]> {
  'use cache'
  cacheLife('minutes')
  const { data, error } = await createPublicClient()
    .from('categories')
    .select(
      'slug, name, description, sort_order, lessons(slug, title, summary, product_name, vimeo_id, is_core, sort_order)',
    )
    .order('sort_order')
    .order('sort_order', { referencedTable: 'lessons' })
  if (error) throw new Error(`Could not load lessons: ${error.message}`)
  return data.map((category) => ({
    slug: category.slug,
    name: category.name,
    description: category.description,
    lessons: category.lessons.map((lesson) => ({
      slug: lesson.slug,
      title: lesson.title,
      productName: lesson.product_name,
      isCore: lesson.is_core,
      summary: lesson.summary,
      vimeoId: isVimeoId(lesson.vimeo_id) ? lesson.vimeo_id : null,
    })),
  }))
}

const toCard = ({ slug, title, productName, isCore }: LessonRecord): LessonCardData => ({
  slug,
  title,
  productName,
  isCore,
})

export async function getLibrary(): Promise<LibraryCategory[]> {
  return (await loadLibrary()).map((category) => ({
    ...category,
    lessons: category.lessons.map(toCard),
  }))
}

export async function getCategoryWithLessons(slug: string): Promise<LibraryCategory | null> {
  return (await getLibrary()).find((category) => category.slug === slug) ?? null
}

export async function getLesson(
  categorySlug: string,
  lessonSlug: string,
): Promise<LessonDetail | null> {
  const category = (await loadLibrary()).find((c) => c.slug === categorySlug)
  if (!category) return null
  const found = neighbours(category.lessons, lessonSlug)
  if (!found) return null
  return {
    ...found.current,
    category: { slug: category.slug, name: category.name },
    previous: found.previous,
    next: found.next,
  }
}

export async function getCategoryParams(): Promise<{ category: string }[]> {
  return (await loadLibrary()).map((category) => ({ category: category.slug }))
}

export async function getLessonParams(): Promise<{ category: string; lesson: string }[]> {
  return (await loadLibrary()).flatMap((category) =>
    category.lessons.map((lesson) => ({ category: category.slug, lesson: lesson.slug })),
  )
}
