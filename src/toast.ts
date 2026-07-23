import { gsap } from 'gsap';

export function showToast(message: string): void {
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
