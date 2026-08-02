import { Entry, sortEntriesForDisplay } from '../types'

export interface VenueLocationOption {
  venue: string
  location: string
}

export interface RemarkSuggestionSource {
  context: string
  remarks?: string | null
}

export interface PlaceSuggestions {
  venues: string[]
  locations: string[]
  remarks: string[]
  venueLocationOptions: VenueLocationOption[]
}

const EMPTY_SUGGESTIONS: PlaceSuggestions = {
  venues: [],
  locations: [],
  remarks: [],
  venueLocationOptions: [],
}

export function normalizePlaceSuggestionKey(value: string) {
  return value.normalize('NFKC').trim().toLocaleLowerCase()
}

function sortedNames(values: Iterable<string>) {
  return [...values].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }),
  )
}

function rememberName(map: Map<string, string>, value: string) {
  const trimmed = value.trim()
  const key = normalizePlaceSuggestionKey(trimmed)
  if (!key || map.has(key)) return
  map.set(key, trimmed)
}

export function getContextPlaceSuggestions(
  entries: Entry[],
  contextId?: string,
  remarkSources: RemarkSuggestionSource[] = [],
): PlaceSuggestions {
  if (!contextId) return EMPTY_SUGGESTIONS

  const venues = new Map<string, string>()
  const locations = new Map<string, string>()
  const remarks = new Map<string, string>()
  const venueLocationPairs = new Map<string, VenueLocationOption>()
  const contextEntries = entries.filter(entry => entry.context === contextId)

  sortEntriesForDisplay(contextEntries, 'newest').forEach(entry => {
    const venue = entry.venue.trim()
    const location = entry.location.trim()
    const venueKey = normalizePlaceSuggestionKey(venue)
    const locationKey = normalizePlaceSuggestionKey(location)

    rememberName(venues, venue)
    rememberName(locations, location)
    rememberName(remarks, entry.remarks)

    if (!venueKey || !locationKey) return
    const pairKey = `${venueKey}|${locationKey}`
    if (venueLocationPairs.has(pairKey)) return
    venueLocationPairs.set(pairKey, { venue, location })
  })

  remarkSources
    .filter(source => source.context === contextId)
    .forEach(source => rememberName(remarks, source.remarks || ''))

  return {
    venues: sortedNames(venues.values()),
    locations: sortedNames(locations.values()),
    remarks: sortedNames(remarks.values()),
    venueLocationOptions: [...venueLocationPairs.values()],
  }
}
