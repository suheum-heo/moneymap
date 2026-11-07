import {
  allocateTimeForNewEntry,
  coerceAmount,
  Context,
  convertEntryAmount,
  Entry,
  EntrySortOrder,
  getEntryCurrency,
  normalizeCurrencyCode,
  usesZeroDecimalCurrency,
} from '../types'
import { getImportableContexts } from '../lib/contextTree'

export type AmountConvertFn = (amount: number, from: string, to: string) => number

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

function roundAmountForCurrency(amount: number, currency: string): number {
  if (!Number.isFinite(amount)) return 0
  if (usesZeroDecimalCurrency(currency)) return Math.round(amount)
  return Math.round(amount * 100) / 100
}

/**
 * Rewrite amount fields so a copied/synced entry matches the target context currency.
 * Prefers an explicit homeAmount (actual charged) when converting into the target.
 */
export function adaptEntryAmountsForContext(
  source: Pick<Entry, 'amount' | 'currency' | 'homeAmount' | 'homeAmountCurrency'>,
  sourceContext: Pick<Context, 'currency' | 'homeCurrency'> | null | undefined,
  targetContext: Pick<Context, 'currency' | 'homeCurrency'> | null | undefined,
  convert: AmountConvertFn,
): Pick<Entry, 'amount' | 'currency' | 'homeAmount' | 'homeAmountCurrency'> {
  const sourceLocal = normalizeCurrencyCode(sourceContext?.currency || source.currency || 'USD')
  const sourceHome = normalizeCurrencyCode(sourceContext?.homeCurrency || sourceLocal)
  const targetLocal = normalizeCurrencyCode(targetContext?.currency || sourceLocal)
  const targetHome = normalizeCurrencyCode(targetContext?.homeCurrency || targetLocal)

  const amount = roundAmountForCurrency(
    convertEntryAmount(source, sourceLocal, sourceHome, targetLocal, convert),
    targetLocal,
  )

  // Target ledger is single-currency: store only the local amount.
  if (targetLocal === targetHome) {
    return {
      amount,
      currency: targetLocal,
      homeAmount: undefined,
      homeAmountCurrency: undefined,
    }
  }

  if (source.homeAmount != null) {
    const homeAmount = roundAmountForCurrency(
      convertEntryAmount(source, sourceLocal, sourceHome, targetHome, convert),
      targetHome,
    )
    return {
      amount,
      currency: targetLocal,
      homeAmount,
      homeAmountCurrency: targetHome,
    }
  }

  // Source has no explicit homeAmount. If its ledger amount is already in the
  // target home currency (e.g. Hidden Money USD → Korea KRW/USD), keep it as
  // actual charged. Otherwise leave unset so live rates can fill the gap.
  const sourceEntryCurrency = getEntryCurrency(source, sourceLocal, sourceHome)
  if (sourceEntryCurrency === targetHome) {
    return {
      amount,
      currency: targetLocal,
      homeAmount: roundAmountForCurrency(coerceAmount(source.amount), targetHome),
      homeAmountCurrency: targetHome,
    }
  }

  return {
    amount,
    currency: targetLocal,
    homeAmount: undefined,
    homeAmountCurrency: undefined,
  }
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
  | 'locationLocal'
  | 'locationEn'
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
    locationLocal: source.locationLocal,
    locationEn: source.locationEn,
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

export type CopyAmountOptions = {
  sourceContext?: Context | null
  targetContext?: Context | null
  convert?: AmountConvertFn
}

/** Apply synced content onto a sibling; keep id/context/time/createdAt local. */
export function applySyncedCopyFields(
  target: Entry,
  source: Entry,
  copyGroupId: string,
  options?: CopyAmountOptions,
): Entry {
  const synced = getSyncedCopyFields(source)
  const adapted = options?.convert && options.targetContext
    ? adaptEntryAmountsForContext(
      source,
      options.sourceContext,
      options.targetContext,
      options.convert,
    )
    : {
      amount: synced.amount,
      currency: synced.currency,
      homeAmount: synced.homeAmount,
      homeAmountCurrency: synced.homeAmountCurrency,
    }

  return {
    ...target,
    ...synced,
    ...adapted,
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
  options?: CopyAmountOptions,
): Entry {
  const sameDayEntries = knownEntries.filter(
    entry => entry.date === source.date && entry.context === targetContextId,
  )
  const copy: Entry = {
    ...source,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    context: targetContextId,
    time: allocateTimeForNewEntry(sameDayEntries, sortOrder),
    createdAt: new Date().toISOString(),
    copyGroupId: copyGroupId || source.copyGroupId || createCopyGroupId(),
  }

  if (!options?.convert) return copy

  return {
    ...copy,
    ...adaptEntryAmountsForContext(
      source,
      options.sourceContext,
      options.targetContext,
      options.convert,
    ),
  }
}

export async function addEntryCopiesToContexts(
  source: Entry,
  targetContextIds: string[],
  knownEntries: Entry[],
  onAdd: (entry: Entry) => Promise<void> | void,
  sortOrder: EntrySortOrder = 'newest',
  copyGroupId?: string,
  options?: {
    contexts?: Context[]
    convert?: AmountConvertFn
  },
) {
  const groupId = copyGroupId || source.copyGroupId || createCopyGroupId()
  const uniqueTargets = Array.from(new Set(targetContextIds.filter(Boolean)))
  const contexts = options?.contexts || []
  const sourceContext = contexts.find(context => context.id === source.context)
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
    const targetContext = contexts.find(context => context.id === targetId)
    const copy = buildEntryCopyForContext(
      source,
      targetId,
      known,
      sortOrder,
      groupId,
      options?.convert
        ? { sourceContext, targetContext, convert: options.convert }
        : undefined,
    )
    await onAdd(copy)
    known = [...known, copy]
    added += 1
  }
  return { added, copyGroupId: groupId }
}
