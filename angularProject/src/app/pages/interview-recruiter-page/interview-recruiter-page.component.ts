import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { resolveApiBasePath } from '../../api-base-path';
import { RecruiterStat, resolveErrorMessage } from '../../utils/interview-utils';

@Component({
  selector: 'app-interview-recruiter-page',
  imports: [RouterLink],
  templateUrl: './interview-recruiter-page.component.html',
  styleUrl: './interview-recruiter-page.component.scss',
})
export class InterviewRecruiterPageComponent {
  private readonly http = inject(HttpClient);

  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly stats = signal<RecruiterStat[]>([]);

  protected readonly avgCompletion = computed(() => {
    const list = this.stats();
    if (!list.length) return 0;
    const col = this.pctCol(list);
    if (!col) return 0;
    const sum = list.reduce((a, r) => a + ((r as Record<string, number>)[col] ?? 0), 0);
    return +(sum / list.length).toFixed(1);
  });

  protected readonly totalInterviews = computed(() => {
    const list = this.stats();
    const col = this.totCol(list);
    if (!col) return 0;
    return list.reduce((a, r) => a + ((r as Record<string, number>)[col] ?? 0), 0);
  });

  constructor() {
    this.loadStats();
  }

  protected nameOf(r: RecruiterStat): string {
    return r.companyName?.trim()
      || r.recruiterName?.trim()
      || r.name?.trim()
      || `Recruiter ${r.recruiterId ?? '?'}`;
  }

  protected pctOf(r: RecruiterStat): number {
    return r.completionPercentage ?? r.completionRate ?? 0;
  }

  protected totalOf(r: RecruiterStat): number {
    return r.totalInterviews ?? r.total ?? 0;
  }

  protected completedOf(r: RecruiterStat): number {
    return r.completed ?? 0;
  }

  protected pendingOf(r: RecruiterStat): number {
    return r.pending ?? 0;
  }

  protected progressColor(pct: number): string {
    if (pct >= 70) return '#16a34a';
    if (pct >= 40) return '#d97706';
    return '#dc2626';
  }

  protected retry(): void {
    this.loadStats();
  }

  private pctCol(list: RecruiterStat[]): string | null {
    if (!list.length) return null;
    const keys = Object.keys(list[0]);
    return keys.find(k => k.toLowerCase().includes('percent') || k.toLowerCase().includes('rate')) ?? null;
  }

  private totCol(list: RecruiterStat[]): string | null {
    if (!list.length) return null;
    const keys = Object.keys(list[0]);
    return keys.find(k => k.toLowerCase().includes('total') || k.toLowerCase() === 'count') ?? null;
  }

  private loadStats(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.http.get<unknown>(`${resolveApiBasePath()}/api/SuperAdmin/GetRecruiterInterviewStats`).subscribe({
      next: (res) => {
        let list: RecruiterStat[] = [];
        if (Array.isArray(res)) {
          list = res as RecruiterStat[];
        } else if (res && typeof res === 'object') {
          const r = res as Record<string, unknown>;
          const byKey = (r['data'] ?? r['recruiterStats'] ?? r['recruiters'] ?? r['recruiterList']) as RecruiterStat[] | undefined;
          if (Array.isArray(byKey)) {
            list = byKey;
          } else {
            for (const val of Object.values(r)) {
              if (Array.isArray(val) && val.length > 0) { list = val as RecruiterStat[]; break; }
            }
            if (!list.length) {
              for (const val of Object.values(r)) {
                if (val && typeof val === 'object' && !Array.isArray(val)) {
                  for (const nested of Object.values(val as object)) {
                    if (Array.isArray(nested) && nested.length > 0) { list = nested as RecruiterStat[]; break; }
                  }
                }
                if (list.length) break;
              }
            }
          }
        }
        this.stats.set(list);
        this.isLoading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(resolveErrorMessage(err));
        this.isLoading.set(false);
      },
    });
  }
}
