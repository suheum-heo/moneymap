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

function amountsMatch(a: number, b: number) {
  return Number(a) === Number(b)
}

/**
 * Legacy / partial copies matched by a stable content fingerprint.
 * Venue/location/paymentMethod are ignored so small local tweaks still link.
 */
export function entriesLookLikeCopies(a: Entry, b: Entry) {
  if (a.context === b.context || a.id === b.id) return false
  return a.date === b.date
    && a.type === b.type
    && amountsMatch(a.amount, b.amount)
    && normalizeComparable(a.currency) === normalizeComparable(b.currency)
    && normalizeComparable(a.summary) === normalizeComparable(b.summary)
    && normalizeComparable(a.category) === normalizeComparable(b.category)
}

export function findCopiedContextIds(entry: Entry, entries: Entry[]): string[] {
  const ids = new Set<string>()
  if (entry.copyGroupId) {
    entries.forEach(candidate => {
      if (candidate.id === entry.id) return
      if (candidate.copyGroupId === entry.copyGroupId) ids.add(candidate.context)
    })
  }
  // Also include fingerprint matches so partially stamped groups still show as copied.
  entries.forEach(candidate => {
    if (entriesLookLikeCopies(entry, candidate)) ids.add(candidate.context)
  })
  return Array.from(ids)
}

/** Content fields that stay in sync across a copy group. */
export function getSyncedCopyFields(source: Entry): Pick<
  Entry,
  | 'type'
  | 'date'
  | 'summary'
  | 'venue'
  | 'location'
  | 'category'
  | 'amount'
  | 'remarks'
  | 'paymentMethod'
  | 'currency'
  | 'homeAmount'
  | 'homeAmountCurrency'
> {
  return {
    type: source.type,
    date: source.date,
    summary: source.summary,
    venue: source.venue,
    location: source.location,
    category: source.category,
    amount: source.amount,
    remarks: source.remarks,
    paymentMethod: source.paymentMethod,
    currency: source.currency,
    homeAmount: source.homeAmount,
    homeAmountCurrency: source.homeAmountCurrency,
  }
}

export function entryContentChanged(a: Entry, b: Entry) {
  const left = getSyncedCopyFields(a)
  const right = getSyncedCopyFields(b)
  return (Object.keys(left) as Array<keyof typeof left>).some(key => left[key] !== right[key])
}

/**
 * Other entries linked to this one.
 * Prefer copyGroupId; always also fingerprint against `previous` so we still
 * find siblings when only some members were stamped with a group id.
 */
export function findCopyGroupEntries(entry: Entry, entries: Entry[], previous?: Entry): Entry[] {
  const byId = new Map<string, Entry>()
  const groupId = entry.copyGroupId || previous?.copyGroupId

  if (groupId) {
    entries.forEach(candidate => {
      if (candidate.id === entry.id) return
      if (candidate.copyGroupId === groupId) byId.set(candidate.id, candidate)
    })
  }

  // Fingerprint against the pre-edit snapshot so content changes still find peers.
  const fingerprintSource = previous || entry
  entries.forEach(candidate => {
    if (candidate.id === entry.id) return
    if (entriesLookLikeCopies(fingerprintSource, candidate)) byId.set(candidate.id, candidate)
  })

  return Array.from(byId.values())
}

/** Apply synced content onto a sibling; keep id/context/time/createdAt local. */
export function applySyncedCopyFields(target: Entry, source: Entry, copyGroupId: string): Entry {
  return {
    ...target,
    ...getSyncedCopyFields(source),
    id: target.id,
    context: target.context,
    time: target.time,
    createdAt: target.createdAt,
    copyGroupId,
  }
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
