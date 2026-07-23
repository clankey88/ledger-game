import type { GameState, Company, User, Member } from './types';

const STORAGE_KEY = 'ledger_game_state_v1';

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function getNextSundayMidnight(): number {
  const now = new Date();
  const nextSunday = new Date(now);
  const daysUntilSunday = (7 - now.getDay()) % 7 || 7;
  nextSunday.setDate(now.getDate() + daysUntilSunday);
  nextSunday.setHours(0, 0, 0, 0);
  if (nextSunday.getTime() <= now.getTime()) {
    nextSunday.setDate(nextSunday.getDate() + 7);
  }
  return nextSunday.getTime();
}

function createDefaultUser(): User {
  return {
    id: generateId(),
    name: '',
    credits: 0,
    cps: 1,
    clickPower: 0.5,
    avatar: '💼',
  };
}

function createDefaultState(): GameState {
  return {
    user: createDefaultUser(),
    company: null,
    weekEndTime: getNextSundayMidnight(),
    lastSavedAt: Date.now(),
  };
}

export function loadState(): GameState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultState();
    const parsed = JSON.parse(raw) as GameState;
    if (!parsed.user) return createDefaultState();

    // Roll over expired weekly timer so the user always has a real countdown
    if (parsed.weekEndTime && parsed.weekEndTime < Date.now()) {
      parsed.weekEndTime = getNextSundayMidnight();
    }

    return {
      ...createDefaultState(),
      ...parsed,
      user: { ...createDefaultUser(), ...parsed.user },
      company: parsed.company || null,
    };
  } catch {
    return createDefaultState();
  }
}

export function saveState(state: GameState): void {
  state.lastSavedAt = Date.now();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function resetState(): GameState {
  localStorage.removeItem(STORAGE_KEY);
  return createDefaultState();
}

export function createCompany(
  state: GameState,
  name: string,
  industry: string
): GameState {
  const company: Company = {
    id: generateId(),
    name,
    industry,
    level: 1,
    poolCredits: 0,
    members: [],
    createdAt: Date.now(),
  };
  state.company = company;
  return state;
}

export function addMember(state: GameState, member: Member): GameState {
  if (!state.company) return state;
  if (!state.company.members.find((m) => m.id === member.id)) {
    state.company.members.push(member);
  }
  return state;
}

export function computePassiveCps(state: GameState): number {
  let cps = state.user.cps;
  if (state.company) {
    cps += state.company.level * 0.5;
    cps += state.company.members.length * 0.3;
  }
  return cps;
}

export function timeUntilPayout(weekEndTime: number): number {
  return Math.max(0, weekEndTime - Date.now());
}

export function projectedEarnings(credits: number): number {
  // 1000 credits = $1
  return Math.floor(credits / 1000) / 100;
}

export { createDefaultState, getNextSundayMidnight, generateId };
