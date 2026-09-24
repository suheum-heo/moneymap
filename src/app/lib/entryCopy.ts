import { allocateTimeForNewEntry, Context, Entry, EntrySortOrder } from '../types'
import { getImportableContexts } from '../lib/contextTree'

export function getCopyTargetContexts(contexts: Context[], excludeId?: string) {
  return getImportableContexts(contexts, excludeId)
}

export function buildEntryCopyForContext(
  source: Entry,
  targetContextId: string,
  knownEntries: Entry[],
  sortOrder: EntrySortOrder = 'newest',
): Entry {
  const sameDayEntries = knownEntries.filter(
    entry => entry.date === source.date && entry.context === targetContextId,
  )
  return {
    ...source,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    context: targetContextId,
    time: allocateTimeForNewEntry(sameDayEntries, sortOrder),
    createdAt: new Date().toISOString(),
  }
}

export async function addEntryCopiesToContexts(
  source: Entry,
  targetContextIds: string[],
  knownEntries: Entry[],
  onAdd: (entry: Entry) => Promise<void> | void,
  sortOrder: EntrySortOrder = 'newest',
) {
  const uniqueTargets = Array.from(new Set(targetContextIds.filter(Boolean)))
  let known = [...knownEntries]
  for (const targetId of uniqueTargets) {
    if (targetId === source.context) continue
    const copy = buildEntryCopyForContext(source, targetId, known, sortOrder)
    await onAdd(copy)
    known = [...known, copy]
  }
  return uniqueTargets.length
}
