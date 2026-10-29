import 'server-only'
import { requireUser } from '@/lib/auth/session'
import { getLibrary } from '@/lib/content/lessons'
import { createSessionClient } from '@/lib/supabase/server'
import { type Dashboard, summariseProgress } from './summary'

/**
 * The signed-in learner's dashboard. Their own rows only (RLS); never cached (control 14).
 * The core-lesson total comes from the public, cached library.
 */
export async function getDashboard(): Promise<Dashboard> {
  await requireUser()
  const supabase = await createSessionClient()
  const [{ data, error }, library] = await Promise.all([
    supabase
      .from('lesson_progress')
      .select('max_percent, completed_at, lessons(slug, title, is_core, categories(slug))')
      .order('updated_at', { ascending: false }),
    getLibrary(),
  ])
  if (error) throw new Error('Could not load progress')
  const totalCore = library.flatMap((c) => c.lessons).filter((l) => l.isCore).length
  return summariseProgress(
    data.map((r) => ({
      maxPercent: r.max_percent,
      completedAt: r.completed_at,
      lesson: r.lessons
        ? {
            slug: r.lessons.slug,
            title: r.lessons.title,
            isCore: r.lessons.is_core,
            categorySlug: r.lessons.categories?.slug ?? '',
          }
        : null,
    })),
    totalCore,
  )
}
