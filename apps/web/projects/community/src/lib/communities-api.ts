import { Injectable, inject } from '@angular/core';
import { ApiClient } from 'core';

/** A reading goal and where it stands (ADR-0021). */
export interface GoalView {
  target: number;
  startsOn: string;
  endsOn: string;
  finished: number;
  state: 'in-progress' | 'reached' | 'ended';
}

export interface GoalInput {
  target: number;
  endsOn: string;
}

/** A member household as the other members see it: only its display name and its count (L2-153). */
export interface Family {
  name: string;
  you: boolean;
  finished: number | null;
}

export interface CommunityView {
  id: string;
  name: string;
  joinCode: string;
  /** Whether this household manages it, and so sets its reading goal. */
  manages: boolean;
  families: Family[];
  goal: GoalView | null;
}

export interface CommunitySummary {
  id: string;
  name: string;
  families: number;
  goal: GoalView | null;
}

/** Every reading goal a household's people see. */
export interface Goals {
  household: GoalView | null;
  communities: { id: string; name: string; goal: GoalView }[];
}

@Injectable({ providedIn: 'root' })
export class CommunitiesApi {
  private readonly api = inject(ApiClient);

  async list() {
    return (await this.api.get<{ communities: CommunitySummary[] }>('/communities')).communities;
  }

  get(id: string) {
    return this.api.get<CommunityView>(`/communities/${encodeURIComponent(id)}`);
  }

  start(name: string, familyName: string) {
    return this.api.post<CommunityView>('/communities', { name, familyName });
  }

  join(code: string, familyName: string) {
    return this.api.post<CommunityView>('/communities/join', { code, familyName });
  }

  leave(id: string) {
    return this.api.delete(`/communities/${encodeURIComponent(id)}/membership`);
  }

  setCommunityGoal(id: string, goal: GoalInput) {
    return this.api.put<CommunityView>(`/communities/${encodeURIComponent(id)}/goal`, goal);
  }

  removeCommunityGoal(id: string) {
    return this.api.delete(`/communities/${encodeURIComponent(id)}/goal`);
  }

  goals() {
    return this.api.get<Goals>('/goals');
  }

  setHouseholdGoal(goal: GoalInput) {
    return this.api.put<GoalView>('/goals/household', goal);
  }

  removeHouseholdGoal() {
    return this.api.delete('/goals/household');
  }
}

const day = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });

/** "10 books by Thu 31 Dec", the line every goal card starts with. */
export function goalLine(goal: GoalView) {
  return `${goal.target} ${goal.target === 1 ? 'book' : 'books'} by ${day.format(new Date(`${goal.endsOn}T00:00:00Z`)).replace(',', '')}`;
}
