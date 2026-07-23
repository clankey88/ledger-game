import { gsap } from 'gsap';
import type { GameState } from './types';
import { computePassiveCps, saveState } from './state';

let loopStarted = false;

export function startGameLoop(state: GameState, onTick: () => void): void {
  if (loopStarted) return;
  loopStarted = true;

  let frameCount = 0;

  gsap.ticker.add((_time, deltaTime) => {
    const cps = computePassiveCps(state);
    const seconds = deltaTime / 1000;
    // deltaTime is in milliseconds
    state.user.credits += cps * seconds;
    if (state.company) {
      state.company.poolCredits += cps * seconds * 0.05;
      // Level up company when pool reaches threshold
      const nextLevelCost = state.company.level * 500;
      while (state.company.poolCredits >= nextLevelCost) {
        state.company.poolCredits -= nextLevelCost;
        state.company.level += 1;
      }
    }
    frameCount += 1;

    // Save state every ~5 seconds (assuming ~60fps)
    if (frameCount % 300 === 0) {
      saveState(state);
    }

    onTick();
  });
}

export function triggerClick(state: GameState): number {
  const base = state.user.clickPower;
  const friendsBonus = state.company ? state.company.members.length * 0.1 : 0;
  const earned = base * (1 + friendsBonus);
  state.user.credits += earned;
  return earned;
}

export function completeTask(state: GameState, reward: number): void {
  state.user.credits += reward;
}

export function cashOut(state: GameState): number {
  const amount = Math.floor(state.user.credits);
  state.user.credits = 0;
  // Reset week timer to next Sunday
  const nextSunday = new Date();
  nextSunday.setDate(nextSunday.getDate() + 7);
  nextSunday.setHours(0, 0, 0, 0);
  state.weekEndTime = nextSunday.getTime();
  saveState(state);
  return amount;
}
