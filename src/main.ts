import './style.css';
import type { GameState } from './types';
import { loadState, saveState, projectedEarnings } from './state';
import { startGameLoop } from './loop';
import { render, updateCountdown, spawnConfetti } from './ui';

function init(): void {
  const state: GameState = loadState();

  // Determine starting screen
  let startScreen: import('./types').Screen = 'onboarding';
  if (state.user.name) {
    startScreen = state.company ? 'dashboard' : 'create-company';
  }

  render(state, startScreen);

  startGameLoop(
    state,
    () => {
      // Update any visible balance displays
      const balanceEl = document.getElementById('dashboard-balance');
      const headerEl = document.getElementById('header-balance');
      const payoutAmountEl = document.getElementById('payout-amount');
      const payoutCreditsEl = document.getElementById('payout-credits');
      const creditsText = Math.floor(state.user.credits).toLocaleString();

      if (balanceEl) balanceEl.textContent = creditsText;
      if (headerEl) headerEl.textContent = creditsText;
      if (payoutAmountEl) {
        payoutAmountEl.textContent = projectedEarnings(state.user.credits).toFixed(2);
      }
      if (payoutCreditsEl) {
        payoutCreditsEl.textContent = creditsText;
      }
    },
    () => {
      spawnConfetti();
    }
  );

  // Countdown refresher
  setInterval(() => updateCountdown(state), 1000);

  // Save on visibility change
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) saveState(state);
  });

  // Save before unload
  window.addEventListener('beforeunload', () => saveState(state));
}

init();
