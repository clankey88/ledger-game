export interface User {
  id: string;
  name: string;
  credits: number;
  cps: number; // credits per second
  clickPower: number;
  avatar: string;
}

export interface Member {
  id: string;
  name: string;
  avatar: string;
  contribution: number;
  joinedAt: number;
}

export interface Company {
  id: string;
  name: string;
  industry: string;
  level: number;
  poolCredits: number;
  members: Member[];
  createdAt: number;
}

export interface GameState {
  user: User;
  company: Company | null;
  weekEndTime: number;
  lastSavedAt: number;
}

export type Screen = 'onboarding' | 'create' | 'create-company' | 'dashboard' | 'company' | 'tasks' | 'payout' | 'invite';
