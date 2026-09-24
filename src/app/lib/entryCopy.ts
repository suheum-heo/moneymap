import { allocateTimeForNewEntry, Context, Entry, EntrySortOrder } from '../types'
import { getImportableContexts } from '../lib/contextTree'

export function getCopyTargetContexts(contexts: Context[], excludeId?: string) {
  return getImportableContexts(contexts, excludeId)
}

export function createCopyGroupId() {
  return `cg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function normalizeComparable(value: string | undefined) {
  return (value || '').normalize('NFKC').trim().toLocaleLowerCase()
}

/** Legacy copies (before copyGroupId) matched by shared content fingerprint. */
export function entriesLookLikeCopies(a: Entry, b: Entry) {
  if (a.context === b.context || a.id === b.id) return false
  return a.date === b.date
    && a.type === b.type
    && a.amount === b.amount
    && a.currency === b.currency
    && normalizeComparable(a.summary) === normalizeComparable(b.summary)
    && normalizeComparable(a.category) === normalizeComparable(b.category)
    && normalizeComparable(a.venue) === normalizeComparable(b.venue)
    && normalizeComparable(a.location) === normalizeComparable(b.location)
    && normalizeComparable(a.paymentMethod) === normalizeComparable(b.paymentMethod)
}

export function findCopiedContextIds(entry: Entry, entries: Entry[]): string[] {
  const ids = new Set<string>()
  if (entry.copyGroupId) {
    entries.forEach(candidate => {
      if (candidate.id === entry.id) return
      if (candidate.copyGroupId === entry.copyGroupId) ids.add(candidate.context)
    })
    return Array.from(ids)
  }

  entries.forEach(candidate => {
    if (entriesLookLikeCopies(entry, candidate)) ids.add(candidate.context)
  })
  return Array.from(ids)
}

export function buildEntryCopyForContext(
  source: Entry,
  targetContextId: string,
  knownEntries: Entry[],
  sortOrder: EntrySortOrder = 'newest',
  copyGroupId?: string,
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
    copyGroupId: copyGroupId || source.copyGroupId || createCopyGroupId(),
  }
}

export async function addEntryCopiesToContexts(
  source: Entry,
  targetContextIds: string[],
  knownEntries: Entry[],
  onAdd: (entry: Entry) => Promise<void> | void,
  sortOrder: EntrySortOrder = 'newest',
  copyGroupId?: string,
) {
  const groupId = copyGroupId || source.copyGroupId || createCopyGroupId()
  const uniqueTargets = Array.from(new Set(targetContextIds.filter(Boolean)))
  let known = [...knownEntries]
  let added = 0
  for (const targetId of uniqueTargets) {
    if (targetId === source.context) continue
    const alreadyThere = known.some(
      entry => entry.context === targetId && (
        (groupId && entry.copyGroupId === groupId)
        || entriesLookLikeCopies({ ...source, copyGroupId: groupId }, entry)
      ),
    )
    if (alreadyThere) continue
    const copy = buildEntryCopyForContext(source, targetId, known, sortOrder, groupId)
    await onAdd(copy)
    known = [...known, copy]
    added += 1
  }
  return { added, copyGroupId: groupId }
}
