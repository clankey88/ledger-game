import { gsap } from 'gsap';
import type { GameState, Screen } from './types';
import {
  computePassiveCps,
  projectedEarnings,
  timeUntilPayout,
  saveState,
  addMember,
  createCompany,
  generateId,
} from './state';
import { triggerClick, cashOut, completeTask } from './loop';
import { briefcaseSvg, coinSvg, ledgerSvg, trophySvg } from './assets';

let currentScreen: Screen = 'onboarding';
const taskCooldowns = new Map<string, number>();
const TASK_COOLDOWN_MS = 5000;

function formatCredits(value: number): string {
  return Math.floor(value).toLocaleString();
}

function formatTime(ms: number): { d: string; h: string; m: string; s: string } {
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  return {
    d: days.toString().padStart(2, '0'),
    h: hours.toString().padStart(2, '0'),
    m: minutes.toString().padStart(2, '0'),
    s: seconds.toString().padStart(2, '0'),
  };
}

function header(title: string, state: GameState): string {
  return `
    <div class="top-bar">
      <div class="logo-text">
        <span>${ledgerSvg}</span>
        <span>Ledger</span>
      </div>
      <div class="balance-pill">
        <span>🪙</span>
        <span class="mono" id="header-balance">${formatCredits(state.user.credits)}</span>
      </div>
    </div>
    <h2 class="mb-3">${title}</h2>
  `;
}

function navDock(active: Screen): string {
  const items: { id: Screen; label: string; icon: string }[] = [
    { id: 'dashboard', label: 'Ledger', icon: '📒' },
    { id: 'company', label: 'Company', icon: '🏢' },
    { id: 'tasks', label: 'Tasks', icon: '⚡' },
    { id: 'payout', label: 'Cash', icon: '💰' },
  ];
  return `
    <div class="nav-dock">
      ${items
        .map(
          (item) => `
        <button class="nav-item ${item.id === active ? 'active' : ''}" data-screen="${item.id}">
          <span class="nav-icon">${item.icon}</span>
          <span>${item.label}</span>
        </button>
      `
        )
        .join('')}
    </div>
  `;
}

function attachNavEvents(state: GameState): void {
  document.querySelectorAll('.nav-item').forEach((el) => {
    el.addEventListener('click', () => {
      const screen = el.getAttribute('data-screen') as Screen;
      render(state, screen);
    });
  });
}

export function renderOnboarding(_state: GameState): string {
  return `
    <div class="screen text-center" id="screen-onboarding">
      <div class="mb-4" style="margin-top: 48px;">${briefcaseSvg}</div>
      <h1 class="mb-2">You are a Ledger.</h1>
      <p class="mb-4">Build a company. Recruit friends. Stack credits. Cash out every Sunday.</p>
      <div class="card card-sticker mb-3" style="text-align:left">
        <h3 class="mb-2">How it works</h3>
        <div class="flex items-center gap-2 mb-2">
          <span>📈</span>
          <p style="font-size:14px">Earn credits passively and by completing tasks.</p>
        </div>
        <div class="flex items-center gap-2 mb-2">
          <span>🤝</span>
          <p style="font-size:14px">Invite friends to join your company for multipliers.</p>
        </div>
        <div class="flex items-center gap-2">
          <span>💵</span>
          <p style="font-size:14px">At the end of the week, credits turn into real money.</p>
        </div>
      </div>
      <button class="btn btn-primary btn-large" id="start-btn">Create Account</button>
    </div>
  `;
}

export function renderCreateAccount(_state: GameState): string {
  return `
    <div class="screen" id="screen-create">
      <div class="top-bar">
        <div class="logo-text">
          <span>${ledgerSvg}</span>
          <span>Ledger</span>
        </div>
      </div>
      <h1 class="mb-2">Start your ledger</h1>
      <p class="mb-4">Pick a name and an avatar. Then build your empire.</p>
      <div class="card card-sticker mb-4">
        <label class="mb-1" style="display:block;font-weight:600">Your name</label>
        <input type="text" id="user-name" placeholder="e.g. Crypto Karen" maxlength="20" />
        <label class="mt-3 mb-1" style="display:block;font-weight:600">Avatar</label>
        <select id="user-avatar">
          <option value="💼">💼 Briefcase</option>
          <option value="🤓">🤓 Nerd</option>
          <option value="🚀">🚀 Rocket</option>
          <option value="🦄">🦄 Unicorn</option>
          <option value="🐳">🐳 Whale</option>
          <option value="👽">👽 Alien</option>
        </select>
      </div>
      <button class="btn btn-primary btn-large" id="create-account-btn">Continue</button>
    </div>
  `;
}

export function renderCreateCompany(_state: GameState): string {
  return `
    <div class="screen" id="screen-company-create">
      <div class="top-bar">
        <div class="logo-text">
          <span>${ledgerSvg}</span>
          <span>Ledger</span>
        </div>
      </div>
      <h1 class="mb-2">Incorporate</h1>
      <p class="mb-4">Create a company to start generating credits with friends.</p>
      <div class="card card-sticker mb-4">
        <label class="mb-1" style="display:block;font-weight:600">Company name</label>
        <input type="text" id="company-name" placeholder="e.g. Moonshot Inc" maxlength="24" />
        <label class="mt-3 mb-1" style="display:block;font-weight:600">Industry</label>
        <select id="company-industry">
          <option value="tech">🖥️ Tech</option>
          <option value="food">🍕 Food</option>
          <option value="fashion">👗 Fashion</option>
          <option value="finance">🏦 Finance</option>
          <option value="energy">⚡ Energy</option>
        </select>
      </div>
      <button class="btn btn-primary btn-large" id="create-company-btn">Incorporate for Free</button>
    </div>
  `;
}

export function renderDashboard(state: GameState): string {
  const cps = computePassiveCps(state);
  return `
    <div class="screen" id="screen-dashboard">
      ${header('Your Ledger', state)}
      <div class="card card-sticker text-center mb-3">
        <p class="mb-1" style="color:var(--gray)">Current Balance</p>
        <div class="mb-2" style="font-size:48px;font-weight:800;letter-spacing:-1px">
          <span class="mono" id="dashboard-balance">${formatCredits(state.user.credits)}</span>
          <span style="font-size:18px;color:var(--gray)">🪙</span>
        </div>
        <p style="font-size:14px;color:var(--gray)">+<span class="mono" id="dashboard-cps">${cps.toFixed(1)}</span> per second</p>
        <button class="btn btn-primary btn-circular mt-3" id="hustle-btn" title="Hustle">⚡</button>
        <p class="mt-2" style="font-size:12px;color:var(--gray)">Tap to hustle</p>
      </div>
      <div class="card mb-3">
        <div class="flex justify-between items-center mb-2">
          <h3 style="margin:0">Weekly Payout In</h3>
          <span style="font-size:12px;color:var(--telegram-blue);font-weight:700">Sunday</span>
        </div>
        <div class="countdown mb-3" id="countdown">
          ${countdownHtml(timeUntilPayout(state.weekEndTime))}
        </div>
        <div class="flex justify-between items-center" style="font-size:14px">
          <span style="color:var(--gray)">Projected</span>
          <span class="mono" style="font-weight:700">$${projectedEarnings(state.user.credits).toFixed(2)}</span>
        </div>
      </div>
      ${state.company ? companyCard(state) : inviteCard(state)}
    </div>
    ${navDock('dashboard')}
  `;
}

function countdownHtml(ms: number): string {
  const t = formatTime(ms);
  return `
    <div class="countdown-box"><span class="countdown-number">${t.d}</span><span class="countdown-label">Days</span></div>
    <div class="countdown-box"><span class="countdown-number">${t.h}</span><span class="countdown-label">Hrs</span></div>
    <div class="countdown-box"><span class="countdown-number">${t.m}</span><span class="countdown-label">Min</span></div>
    <div class="countdown-box"><span class="countdown-number">${t.s}</span><span class="countdown-label">Sec</span></div>
  `;
}

function companyCard(state: GameState): string {
  const company = state.company!;
  const avatars = company.members
    .slice(0, 4)
    .map((m) => `<div class="avatar">${m.avatar}</div>`)
    .join('');
  return `
    <div class="card card-sticker">
      <div class="flex justify-between items-center mb-2">
        <h2 style="margin:0">${company.name}</h2>
        <span style="font-size:12px;color:var(--gray);font-weight:600">Lv. ${company.level}</span>
      </div>
      <p class="mb-2">${company.industry}</p>
      <div class="flex justify-between items-center mb-3">
        <div class="avatar-stack">${avatars}</div>
        <span style="font-size:13px;color:var(--gray)">${company.members.length + 1} members</span>
      </div>
      <div class="progress-track mb-2">
        <div class="progress-fill" style="width:${Math.min(100, (company.poolCredits / (company.level * 500)) * 100)}%"></div>
      </div>
      <p style="font-size:13px;color:var(--gray)">${formatCredits(Math.max(0, company.level * 500 - company.poolCredits))} credits to next level</p>
    </div>
  `;
}

function inviteCard(_state: GameState): string {
  return `
    <div class="card card-sticker text-center">
      <div class="mb-2">${coinSvg}</div>
      <h2 class="mb-1">No company yet</h2>
      <p class="mb-3">Create one to earn together with friends.</p>
      <button class="btn btn-primary" id="create-company-nav-btn">Create Company</button>
    </div>
  `;
}

export function renderCompany(state: GameState): string {
  const company = state.company;
  if (!company) {
    return `
      <div class="screen">
        ${header('Company', state)}
        <div class="card card-sticker text-center">
          <div class="mb-2">${briefcaseSvg}</div>
          <h2 class="mb-1">No company yet</h2>
          <p class="mb-3">Incorporate your first business to start playing.</p>
          <button class="btn btn-primary" id="create-company-nav-btn">Create Company</button>
        </div>
        ${navDock('company')}
      </div>
    `;
  }

  const membersHtml = company.members
    .map(
      (m) => `
    <div class="flex items-center justify-between mb-2" style="padding:10px 0;border-bottom:1px solid var(--gray-light)">
      <div class="flex items-center gap-2">
        <div class="avatar">${m.avatar}</div>
        <div>
          <div style="font-weight:700;font-size:14px">${m.name || 'Anonymous'}</div>
          <div style="font-size:12px;color:var(--gray)">Joined just now</div>
        </div>
      </div>
      <div class="mono" style="font-weight:700">+${m.contribution.toFixed(0)}</div>
    </div>
  `
    )
    .join('');

  return `
    <div class="screen" id="screen-company">
      ${header(company.name, state)}
      <div class="card card-sticker mb-3">
        <div class="flex justify-between items-center mb-2">
          <h3>Company Stats</h3>
          <span style="font-size:12px;color:var(--gray);font-weight:600">Lv. ${company.level}</span>
        </div>
        <div class="flex justify-between items-center mb-2" style="font-size:15px">
          <span>Pool Credits</span>
          <span class="mono">${formatCredits(company.poolCredits)} 🪙</span>
        </div>
        <div class="flex justify-between items-center mb-2" style="font-size:15px">
          <span>Members</span>
          <span class="mono">${company.members.length + 1}</span>
        </div>
        <div class="progress-track mb-2">
          <div class="progress-fill" style="width:${Math.min(100, (company.poolCredits / (company.level * 500)) * 100)}%"></div>
        </div>
        <p style="font-size:13px;color:var(--gray)">${formatCredits(Math.max(0, company.level * 500 - company.poolCredits))} credits to next level</p>
      </div>
      <div class="card mb-3">
        <h3 class="mb-2">Members</h3>
        <div>${membersHtml || '<p style="color:var(--gray);font-size:14px">Just you so far. Invite friends!</p>'}</div>
      </div>
      <button class="btn btn-primary btn-large" id="invite-friend-btn">Invite Friend</button>
      ${navDock('company')}
    </div>
  `;
}

export function renderTasks(_state: GameState): string {
  const tasks = [
    { id: 'audit', label: 'Audit the books', reward: 25, icon: '📊' },
    { id: 'pitch', label: 'Pitch a VC', reward: 50, icon: '📢' },
    { id: 'launch', label: 'Launch feature', reward: 100, icon: '🚀' },
    { id: 'tweet', label: 'Shill on X', reward: 15, icon: '🐦' },
  ];

  return `
    <div class="screen" id="screen-tasks">
      ${header('Tasks', _state)}
      <p class="mb-3">Complete tasks to earn bonus credits. Resets weekly.</p>
      <div class="flex flex-col gap-2">
        ${tasks
          .map(
            (task) => `
          <button class="task-card" data-task="${task.id}" data-reward="${task.reward}">
            <div class="flex justify-between items-center" style="width:100%">
              <div class="flex items-center gap-2">
                <span style="font-size:24px">${task.icon}</span>
                <div style="text-align:left">
                  <div style="font-weight:700">${task.label}</div>
                  <div style="font-size:13px;color:var(--gray)">+${task.reward} credits</div>
                </div>
              </div>
              <span style="font-size:20px">→</span>
            </div>
          </button>
        `
          )
          .join('')}
      </div>
      ${navDock('tasks')}
    </div>
  `;
}

export function renderPayout(state: GameState): string {
  return `
    <div class="screen" id="screen-payout">
      ${header('Cash Out', state)}
      <div class="card card-sticker text-center mb-3">
        <div class="mb-2">${trophySvg}</div>
        <h2 class="mb-1">Weekly Payout</h2>
        <p class="mb-3">Every Sunday at midnight, your credits turn into money.</p>
        <div style="font-size:36px;font-weight:800;letter-spacing:-1px" class="mb-1">
          $<span class="mono" id="payout-amount">${projectedEarnings(state.user.credits).toFixed(2)}</span>
        </div>
        <p class="mb-3" style="color:var(--gray)">from <span class="mono" id="payout-credits">${formatCredits(state.user.credits)}</span> credits</p>
        <button class="btn btn-primary btn-large" id="cash-out-btn" ${state.user.credits < 1000 ? 'disabled' : ''}>
          Cash Out Now
        </button>
        <p class="mt-2" style="font-size:12px;color:var(--gray)">Minimum cashout: 1,000 credits</p>
      </div>
      <div class="card">
        <h3 class="mb-2">Rates</h3>
        <div class="flex justify-between items-center mb-2" style="font-size:15px">
          <span>1,000 credits</span>
          <span class="mono">$0.01</span>
        </div>
        <div class="flex justify-between items-center" style="font-size:15px">
          <span>100,000 credits</span>
          <span class="mono">$1.00</span>
        </div>
      </div>
      ${navDock('payout')}
    </div>
  `;
}

export function render(state: GameState, screen: Screen = currentScreen): void {
  const app = document.getElementById('app');
  if (!app) return;

  currentScreen = screen;
  let html = '';
  switch (screen) {
    case 'onboarding':
      html = renderOnboarding(state);
      break;
    case 'create':
      html = renderCreateAccount(state);
      break;
    case 'create-company':
      html = renderCreateCompany(state);
      break;
    case 'dashboard':
      html = renderDashboard(state);
      break;
    case 'company':
      html = renderCompany(state);
      break;
    case 'tasks':
      html = renderTasks(state);
      break;
    case 'payout':
      html = renderPayout(state);
      break;
    default:
      html = renderOnboarding(state);
  }

  app.innerHTML = html;
  attachEvents(state, screen);

  // Animate screen entry
  const screenEl = document.querySelector('.screen');
  if (screenEl) {
    gsap.fromTo(screenEl, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' });
  }
  const cards = gsap.utils.toArray('.card') as HTMLElement[];
  if (cards.length > 0) {
    gsap.fromTo(cards, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.4, stagger: 0.06, ease: 'power2.out' });
  }
}

function attachEvents(state: GameState, screen: Screen): void {
  if (screen === 'onboarding') {
    document.getElementById('start-btn')?.addEventListener('click', () => {
      render(state, 'create');
    });
  }

  if (screen === 'create') {
    document.getElementById('create-account-btn')?.addEventListener('click', () => {
      const nameInput = document.getElementById('user-name') as HTMLInputElement;
      const avatarInput = document.getElementById('user-avatar') as HTMLSelectElement;
      state.user.name = nameInput.value.trim() || 'Ledger ' + state.user.id.slice(0, 4);
      state.user.avatar = avatarInput.value;
      saveState(state);
      render(state, state.company ? 'dashboard' : 'create-company');
    });
  }

  if (screen === 'create-company') {
    document.getElementById('create-company-btn')?.addEventListener('click', () => {
      const nameInput = document.getElementById('company-name') as HTMLInputElement;
      const industryInput = document.getElementById('company-industry') as HTMLSelectElement;
      const name = nameInput.value.trim() || 'Acme Corp';
      createCompany(state, name, industryInput.value);
      // Add self as first member
      addMember(state, {
        id: state.user.id,
        name: state.user.name,
        avatar: state.user.avatar,
        contribution: 0,
        joinedAt: Date.now(),
      });
      saveState(state);
      render(state, 'dashboard');
    });
  }

  if (screen === 'dashboard') {
    const hustleBtn = document.getElementById('hustle-btn');
    hustleBtn?.addEventListener('click', (e) => {
      const event = e as MouseEvent;
      const earned = triggerClick(state);
      spawnFloatingText(event.clientX, event.clientY, `+${earned.toFixed(1)}`);
      gsap.fromTo(hustleBtn, { scale: 0.9 }, { scale: 1, duration: 0.3, ease: 'elastic.out(1, 0.4)' });
      updateDashboardNumbers(state);
    });
    attachNavEvents(state);
  }

  if (screen === 'company') {
    document.getElementById('invite-friend-btn')?.addEventListener('click', () => {
      spawnFriendInvite(state);
    });
    document.getElementById('create-company-nav-btn')?.addEventListener('click', () => {
      render(state, 'create-company');
    });
    attachNavEvents(state);
  }

  if (screen === 'tasks') {
    document.querySelectorAll('.task-card').forEach((card) => {
      const taskId = card.getAttribute('data-task') || '';
      const cooldownUntil = taskCooldowns.get(taskId) || 0;
      const isOnCooldown = Date.now() < cooldownUntil;
      if (isOnCooldown) {
        card.setAttribute('aria-disabled', 'true');
        card.setAttribute('style', 'opacity:0.6;cursor:not-allowed');
      }
      card.addEventListener('click', () => {
        const now = Date.now();
        if (now < (taskCooldowns.get(taskId) || 0)) {
          showToast('Cooling down, try again soon');
          return;
        }
        const reward = parseFloat(card.getAttribute('data-reward') || '0');
        completeTask(state, reward);
        taskCooldowns.set(taskId, now + TASK_COOLDOWN_MS);
        card.setAttribute('style', 'opacity:0.6;cursor:not-allowed');
        card.setAttribute('aria-disabled', 'true');
        gsap.to(card, { scale: 0.98, duration: 0.1, yoyo: true, repeat: 1 });
        const rect = card.getBoundingClientRect();
        spawnFloatingText(rect.left + rect.width / 2, rect.top, `+${reward}`);
        setTimeout(() => {
          if (currentScreen === 'tasks') render(state, 'tasks');
        }, TASK_COOLDOWN_MS);
      });
    });
    attachNavEvents(state);
  }

  if (screen === 'payout') {
    document.getElementById('cash-out-btn')?.addEventListener('click', () => {
      if (state.user.credits < 1000) return;
      cashOut(state);
      showToast('Cashed out! New week starts now.');
      render(state, 'payout');
    });
    attachNavEvents(state);
  }
}

function updateDashboardNumbers(state: GameState): void {
  const balanceEl = document.getElementById('dashboard-balance');
  const headerEl = document.getElementById('header-balance');
  if (balanceEl) balanceEl.textContent = formatCredits(state.user.credits);
  if (headerEl) headerEl.textContent = formatCredits(state.user.credits);
}

function spawnFloatingText(x: number, y: number, text: string): void {
  const el = document.createElement('div');
  el.className = 'particle';
  el.textContent = text;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  document.body.appendChild(el);
  gsap.fromTo(
    el,
    { opacity: 1, y: 0 },
    {
      opacity: 0,
      y: -40,
      duration: 1,
      ease: 'power2.out',
      onComplete: () => el.remove(),
    }
  );
}

async function spawnFriendInvite(state: GameState): Promise<void> {
  const inviteUrl = `https://clankey88.github.io/ledger-game/?ref=${state.user.id}`;
  const message = `Join my company on Ledger and help me cash out this Sunday! ${inviteUrl}`;

  // Prefer native share on mobile
  if (navigator.share) {
    try {
      await navigator.share({ title: 'Join my Ledger company', text: message, url: inviteUrl });
      showToast('Invite sent!');
    } catch {
      showToast('Invite cancelled');
    }
    return;
  }

  if (navigator.clipboard) {
    await navigator.clipboard.writeText(message);
    showToast('Invite link copied!');
    return;
  }

  showToast('Share this link: ' + inviteUrl);

  // Demo fallback: simulate a friend joining when sharing isn't available
  const names = ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley'];
  const avatars = ['🐶', '', '🐭', '🐹', '🐰', '🦊'];
  const name = names[Math.floor(Math.random() * names.length)];
  const avatar = avatars[Math.floor(Math.random() * avatars.length)];
  addMember(state, {
    id: generateId(),
    name,
    avatar,
    contribution: Math.floor(Math.random() * 50),
    joinedAt: Date.now(),
  });
  saveState(state);
  showToast(`${name} joined your company!`);
  render(state, 'company');
}

function showToast(message: string): void {
  const existing = document.getElementById('toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.id = 'toast';
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  gsap.fromTo(toast, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' });
  gsap.to(toast, { opacity: 0, y: -20, duration: 0.3, delay: 2.5, onComplete: () => toast.remove() });
}

// Countdown updater
export function updateCountdown(state: GameState): void {
  const el = document.getElementById('countdown');
  if (!el || currentScreen !== 'dashboard') return;
  el.innerHTML = countdownHtml(timeUntilPayout(state.weekEndTime));
}
