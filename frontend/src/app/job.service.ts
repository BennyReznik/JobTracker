import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Job, JobInput, Settings } from './job.model';

@Injectable({ providedIn: 'root' })
export class JobService {
  private readonly http = inject(HttpClient);

  list(): Promise<Job[]> {
    return firstValueFrom(this.http.get<Job[]>('/api/jobs'));
  }

  create(job: JobInput): Promise<Job> {
    return firstValueFrom(this.http.post<Job>('/api/jobs', job));
  }

  update(id: string, job: JobInput): Promise<Job> {
    return firstValueFrom(this.http.put<Job>(`/api/jobs/${id}`, job));
  }

  remove(id: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`/api/jobs/${id}`));
  }

  getSettings(): Promise<Settings> {
    return firstValueFrom(this.http.get<Settings>('/api/settings'));
  }

  saveSettings(settings: Settings): Promise<Settings> {
    return firstValueFrom(this.http.put<Settings>('/api/settings', settings));
  }
}
