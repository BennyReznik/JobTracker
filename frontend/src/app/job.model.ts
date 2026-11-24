export type JobStatus =
  | 'wishlist'
  | 'applied'
  | 'interviewing'
  | 'offer'
  | 'rejected'
  | 'withdrawn';

export interface StatusInfo {
  value: JobStatus;
  label: string;
  color: string;
}

export const STATUSES: StatusInfo[] = [
  { value: 'wishlist', label: 'Wishlist', color: 'var(--s-wish)' },
  { value: 'applied', label: 'Applied', color: 'var(--s-app)' },
  { value: 'interviewing', label: 'Interviewing', color: 'var(--s-int)' },
  { value: 'offer', label: 'Offer', color: 'var(--s-off)' },
  { value: 'rejected', label: 'Rejected', color: 'var(--s-rej)' },
  { value: 'withdrawn', label: 'Withdrawn', color: 'var(--s-wish)' },
];

/** Statuses that are finished: hidden by the "Active" filter. */
export const CLOSED_STATUSES: readonly JobStatus[] = ['rejected', 'withdrawn'];

export const isActive = (s: JobStatus): boolean => !CLOSED_STATUSES.includes(s);

/** Status tiles: everything, only active applications, or one status. */
export type JobFilter = 'all' | 'active' | JobStatus;

/** List order. Jobs without an apply date always go last when sorting by date. */
export type JobSort = 'updated' | 'applied-desc' | 'applied-asc' | 'status';

export const SORTS: { value: JobSort; label: string }[] = [
  { value: 'updated', label: 'Last updated' },
  { value: 'applied-desc', label: 'Applied: newest first' },
  { value: 'applied-asc', label: 'Applied: oldest first' },
  { value: 'status', label: 'Status (rejected last)' },
];

/** Order for the "Status" sort: furthest along first, rejected at the bottom. */
export const STATUS_SORT_ORDER: readonly JobStatus[] = [
  'offer', 'interviewing', 'applied', 'wishlist', 'withdrawn', 'rejected',
];

/** What the form edits and the API accepts. */
export interface JobInput {
  company: string;
  role: string;
  status: JobStatus;
  applied: string | null; // yyyy-mm-dd
  nextStep: string | null;
  nextDate: string | null; // yyyy-mm-dd
  url: string | null;
  notes: string | null;
  location: string | null;
  carMin: number | null;
  carMax: number | null;
  carNote: string | null;
  transitMin: number | null;
  transitMax: number | null;
  transitNote: string | null;
}

/** What the API returns. */
export interface Job extends JobInput {
  id: string;
  updatedUtc: string;
}

export interface Settings {
  leaveFrom: string; // HH:mm
  leaveTo: string; // HH:mm
}

export function emptyJob(): JobInput {
  return {
    company: '',
    role: '',
    status: 'applied',
    applied: null,
    nextStep: null,
    nextDate: null,
    url: null,
    notes: null,
    location: null,
    carMin: null,
    carMax: null,
    carNote: null,
    transitMin: null,
    transitMax: null,
    transitNote: null,
  };
}
