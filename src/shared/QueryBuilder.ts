import { QueryFilter } from 'mongoose';

export interface FilterFieldConfig {
  field: string;
  mode: 'exact' | 'text';
}

export interface ParsedListQuery<TDocument> {
  filter: QueryFilter<TDocument>;
  sort: Record<string, 1 | -1>;
  page: number;
  limit: number;
  skip: number;
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

// Escape special characters in a string for use in a regular expression
function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Parses query parameters for filtering, sorting, and pagination into a Mongo query.
export function parseListQuery<TDocument>(
  query: Record<string, unknown>,
  filterFields: FilterFieldConfig[],
  sortFields: string[],
  defaultSort: Record<string, 1 | -1> = { createdAt: -1 },
): ParsedListQuery<TDocument> {
  const filter: Record<string, unknown> = {};

  for (const { field, mode } of filterFields) {
    const raw = query[field];
    if (typeof raw !== 'string' || raw.trim() === '') continue;
    filter[field] = mode === 'text' ? { $regex: escapeRegex(raw), $options: 'i' } : raw;
  }

  let sort = defaultSort;
  if (typeof query.sort === 'string' && query.sort.trim() !== '') {
    const raw = query.sort.trim();
    const direction = raw.startsWith('-') ? -1 : 1;
    const field = raw.replace(/^-/, '');
    if (sortFields.includes(field)) {
      sort = { [field]: direction };
    }
  }

  const page = Math.max(1, parseInt(query.page as string) || 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(query.limit as string) || DEFAULT_LIMIT));
  const skip = (page - 1) * limit;

  return {
    filter: filter as QueryFilter<TDocument>,
    sort,
    skip,
    limit,
    page,
  };
}
