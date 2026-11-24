import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  Job, JobFilter, JobInput, JobSort, JobStatus, SORTS, STATUSES, STATUS_SORT_ORDER, StatusInfo, emptyJob, isActive,
} from './job.model';
import { JobService } from './job.service';

const FILTER_KEY = 'jobTracker.filter';
const SORT_KEY = 'jobTracker.sort';

function loadSort(): JobSort {
  const saved = localStorage.getItem(SORT_KEY);
  return SORTS.some((s) => s.value === saved) ? (saved as JobSort) : 'updated';
}

function loadFilter(): JobFilter {
  const saved = localStorage.getItem(FILTER_KEY);
  const valid = ['all', 'active', ...STATUSES.map((s) => s.value)];
  return saved && valid.includes(saved) ? (saved as JobFilter) : 'all';
}

@Component({
  selector: 'app-root',
  imports: [FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  private readonly api = inject(JobService);

  readonly statuses = STATUSES;
  readonly sorts = SORTS;

  readonly jobs = signal<Job[]>([]);
  readonly filter = signal<JobFilter>(loadFilter());
  readonly sort = signal<JobSort>(loadSort());
  readonly search = signal('');
  readonly leaveFrom = signal('08:00');
  readonly leaveTo = signal('09:00');
  readonly error = signal<string | null>(null);
  readonly loading = signal(true);

  // Edit dialog state
  readonly editing = signal<Job | null>(null);
  readonly dialogOpen = signal(false);
  form: JobInput = emptyJob();

  readonly counts = computed(() => {
    const result: Record<string, number> = { all: this.jobs().length, active: 0 };
    for (const s of STATUSES) result[s.value] = 0;
    for (const j of this.jobs()) {
      result[j.status]++;
      if (isActive(j.status)) result['active']++;
    }
    return result;
  });

  readonly visible = computed(() => {
    const f = this.filter();
    const q = this.search().trim().toLowerCase();
    const filtered = this.jobs().filter((j) => {
      if (f === 'active' ? !isActive(j.status) : f !== 'all' && j.status !== f) return false;
      if (!q) return true;
      return [j.company, j.role, j.location, j.notes]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q));
    });
    return this.sorted(filtered, this.sort());
  });

  /** 'updated' keeps the API order (most recently updated first). */
  private sorted(list: Job[], sort: JobSort): Job[] {
    if (sort === 'updated') return list;
    if (sort === 'status') {
      // Stable sort: within a status, jobs keep the last-updated order.
      const rank = (s: JobStatus) => STATUS_SORT_ORDER.indexOf(s);
      return [...list].sort((a, b) => rank(a.status) - rank(b.status));
    }
    const dir = sort === 'applied-desc' ? -1 : 1;
    return [...list].sort((a, b) => {
      if (!a.applied || !b.applied) return (a.applied ? 0 : 1) - (b.applied ? 0 : 1); // no date → last
      return a.applied.localeCompare(b.applied) * dir; // yyyy-mm-dd sorts as text
    });
  }

  setSort(s: JobSort): void {
    this.sort.set(s);
    localStorage.setItem(SORT_KEY, s);
  }

  async ngOnInit(): Promise<void> {
    try {
      const [jobs, settings] = await Promise.all([this.api.list(), this.api.getSettings()]);
      this.jobs.set(jobs);
      this.leaveFrom.set(settings.leaveFrom);
      this.leaveTo.set(settings.leaveTo);
    } catch {
      this.error.set('Could not reach the API. Is the backend running?');
    } finally {
      this.loading.set(false);
    }
  }

  statusInfo(s: JobStatus): StatusInfo {
    return STATUSES.find((x) => x.value === s)!;
  }

  setFilter(f: JobFilter): void {
    this.filter.set(f);
    localStorage.setItem(FILTER_KEY, f);
  }

  // ---- commute / arrival helpers ----

  private toMinutes(hhmm: string): number {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
  }

  private fmt(totalMinutes: number): string {
    const t = ((totalMinutes % 1440) + 1440) % 1440;
    const h = Math.floor(t / 60).toString().padStart(2, '0');
    const m = (t % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
  }

  /** Earliest arrival (leave at start of window + min) to latest (end of window + max). */
  arrival(min: number | null, max: number | null): string | null {
    if (min == null && max == null) return null;
    const lo = min ?? max!;
    const hi = max ?? min!;
    return `${this.fmt(this.toMinutes(this.leaveFrom()) + lo)}–${this.fmt(this.toMinutes(this.leaveTo()) + hi)}`;
  }

  duration(min: number | null, max: number | null): string | null {
    if (min == null && max == null) return null;
    if (min == null || max == null || min === max) return `${min ?? max} min`;
    return `${min}–${max} min`;
  }

  // ---- next-step due state ----

  dueState(j: Job): 'overdue' | 'soon' | null {
    if (!j.nextDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(j.nextDate + 'T00:00:00');
    const days = Math.round((due.getTime() - today.getTime()) / 86400000);
    if (days < 0) return 'overdue';
    if (days <= 3) return 'soon';
    return null;
  }

  // ---- settings ----

  async saveLeaveWindow(): Promise<void> {
    try {
      await this.api.saveSettings({ leaveFrom: this.leaveFrom(), leaveTo: this.leaveTo() });
      this.error.set(null);
    } catch {
      this.error.set('Could not save the leaving-time window (use HH:mm).');
    }
  }

  // ---- dialog ----

  openNew(): void {
    this.editing.set(null);
    this.form = emptyJob();
    this.dialogOpen.set(true);
  }

  openEdit(job: Job): void {
    this.editing.set(job);
    const { id: _id, updatedUtc: _u, ...input } = job;
    this.form = { ...input };
    this.dialogOpen.set(true);
  }

  closeDialog(): void {
    this.dialogOpen.set(false);
  }

  async save(): Promise<void> {
    if (!this.form.company.trim() && !this.form.role.trim()) return;
    const payload = this.normalize(this.form);
    try {
      const current = this.editing();
      if (current) {
        const saved = await this.api.update(current.id, payload);
        this.jobs.update((list) => list.map((j) => (j.id === saved.id ? saved : j)));
      } else {
        const saved = await this.api.create(payload);
        this.jobs.update((list) => [saved, ...list]);
      }
      this.error.set(null);
      this.dialogOpen.set(false);
    } catch {
      this.error.set('Saving failed. Check the fields and try again.');
    }
  }

  async remove(): Promise<void> {
    const current = this.editing();
    if (!current || !confirm(`Delete "${current.company} – ${current.role}"?`)) return;
    try {
      await this.api.remove(current.id);
      this.jobs.update((list) => list.filter((j) => j.id !== current.id));
      this.dialogOpen.set(false);
    } catch {
      this.error.set('Delete failed.');
    }
  }

  /** Empty inputs become null so the API stores them as missing. */
  private normalize(f: JobInput): JobInput {
    const s = (v: string | null) => (v && v.trim() ? v.trim() : null);
    const n = (v: number | null) => (v === null || (v as unknown) === '' ? null : Number(v));
    return {
      ...f,
      company: f.company.trim(),
      role: f.role.trim(),
      applied: s(f.applied),
      nextStep: s(f.nextStep),
      nextDate: s(f.nextDate),
      url: s(f.url),
      notes: s(f.notes),
      location: s(f.location),
      carMin: n(f.carMin),
      carMax: n(f.carMax),
      carNote: s(f.carNote),
      transitMin: n(f.transitMin),
      transitMax: n(f.transitMax),
      transitNote: s(f.transitNote),
    };
  }
}
