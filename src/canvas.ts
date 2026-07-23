import { gsap } from 'gsap';
import type { GameState, Member } from './types';
import { showToast } from './toast';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  text?: string;
  color: string;
  size: number;
}

interface FlowDot {
  t: number; // 0..1 along edge
  speed: number;
  edgeIndex: number; // which friend edge this dot travels
  direction: 'player-friend' | 'friend-company';
}

interface Node {
  id: string;
  x: number;
  y: number;
  radius: number;
  label: string;
  emoji: string;
  color: string;
  targetRadius: number;
}

interface ConfettiPiece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  rotation: number;
  rotationSpeed: number;
  gravity: number;
}

export class GameCanvas {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private state: GameState;
  private nodes: Map<string, Node> = new Map();
  private particles: Particle[] = [];
  private flowDots: FlowDot[] = [];
  private confetti: ConfettiPiece[] = [];
  private width = 0;
  private height = 0;
  private dpr = 1;
  private rafId = 0;
  private onHustle?: () => void;
  private onCashOut?: () => void;

  constructor(canvas: HTMLCanvasElement, state: GameState) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');
    this.ctx = ctx;
    this.state = state;
    this.resize();
    this.bindEvents();
  }

  setHandlers(handlers: { onHustle?: () => void; onCashOut?: () => void }) {
    this.onHustle = handlers.onHustle;
    this.onCashOut = handlers.onCashOut;
  }

  private resize() {
    const parent = this.canvas.parentElement;
    const width = parent ? parent.clientWidth : window.innerWidth;
    const height = parent ? parent.clientHeight : window.innerHeight;
    this.dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.floor(width * this.dpr);
    this.canvas.height = Math.floor(height * this.dpr);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.width = width;
    this.height = height;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  private handleResize = () => this.resize();

  private bindEvents() {
    window.addEventListener('resize', this.handleResize);
    this.canvas.addEventListener('click', this.handleClick);
  }

  private getFriendNodes(): Node[] {
    const friends: Node[] = [];
    const company = this.state.company;
    if (!company) return friends;

    const cx = this.width / 2;
    const cy = this.height / 2;
    const radius = Math.min(this.width, this.height) * 0.28;
    const count = company.members.length;

    company.members.forEach((member: Member, index: number) => {
      const angle = (Math.PI * 2 * index) / Math.max(1, count) - Math.PI / 2;
      friends.push({
        id: `friend-${member.id}`,
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius,
        radius: 24,
        label: member.name,
        emoji: member.avatar,
        color: '#2481CC',
        targetRadius: 24,
      });
    });
    return friends;
  }

  private updateNodes() {
    const cx = this.width / 2;
    const cy = this.height / 2;

    // Player at center
    if (!this.nodes.has('player')) {
      this.nodes.set('player', {
        id: 'player',
        x: cx,
        y: cy,
        radius: 40,
        label: this.state.user.name || 'You',
        emoji: this.state.user.avatar,
        color: '#2481CC',
        targetRadius: 40,
      });
    } else {
      const player = this.nodes.get('player')!;
      player.x = cx;
      player.y = cy;
      player.label = this.state.user.name || 'You';
      player.emoji = this.state.user.avatar;
    }

    // Company at top
    if (!this.nodes.has('company')) {
      this.nodes.set('company', {
        id: 'company',
        x: cx,
        y: this.height * 0.18,
        radius: 48,
        label: this.state.company?.name || 'Company',
        emoji: '🏢',
        color: '#34C759',
        targetRadius: 48,
      });
    } else {
      const company = this.nodes.get('company')!;
      company.x = cx;
      company.y = this.height * 0.18;
      company.label = this.state.company?.name || 'Company';
    }

    // Friends orbit around center
    const friends = this.getFriendNodes();
    friends.forEach((friend) => {
      if (this.nodes.has(friend.id)) {
        const existing = this.nodes.get(friend.id)!;
        existing.x = friend.x;
        existing.y = friend.y;
        existing.label = friend.label;
        existing.emoji = friend.emoji;
      } else {
        this.nodes.set(friend.id, friend);
      }
    });

    // Remove stale friend nodes
    const friendIds = new Set(friends.map((f) => f.id));
    for (const id of this.nodes.keys()) {
      if (id.startsWith('friend-') && !friendIds.has(id)) {
        this.nodes.delete(id);
      }
    }
  }

  spawnHustleParticles() {
    const player = this.nodes.get('player');
    const company = this.nodes.get('company');
    if (!player || !company) return;

    const count = 8 + Math.floor(Math.random() * 4);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 3;
      this.particles.push({
        x: player.x + Math.cos(angle) * player.radius,
        y: player.y + Math.sin(angle) * player.radius,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 40 + Math.random() * 20,
        text: i === 0 ? `+${this.state.user.clickPower.toFixed(1)}` : undefined,
        color: '#2481CC',
        size: 4 + Math.random() * 3,
      });
    }

    // Also spawn a coin traveling to company
    this.spawnCoinToCompany();
  }

  spawnCoinToCompany() {
    const player = this.nodes.get('player');
    const company = this.nodes.get('company');
    if (!player || !company) return;

    const dx = company.x - player.x;
    const dy = company.y - player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const speed = 4;
    this.particles.push({
      x: player.x,
      y: player.y,
      vx: (dx / dist) * speed,
      vy: (dy / dist) * speed,
      life: 0,
      maxLife: dist / speed,
      text: '🪙',
      color: '#2481CC',
      size: 16,
    });
  }

  spawnTapParticles(x: number, y: number) {
    for (let i = 0; i < 5; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 2;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 30 + Math.random() * 20,
        color: '#2481CC',
        size: 3 + Math.random() * 2,
      });
    }
  }

  pulseNode(id: string) {
    const node = this.nodes.get(id);
    if (!node) return;
    gsap.to(node, {
      radius: node.targetRadius * 1.2,
      duration: 0.15,
      yoyo: true,
      repeat: 1,
      ease: 'power2.out',
    });
  }

  spawnConfetti(x?: number, y?: number) {
    const cx = x ?? this.width / 2;
    const cy = y ?? this.height / 2;
    const colors = ['#2481CC', '#34C759', '#FF9500', '#FF3B30', '#FFD60A'];
    for (let i = 0; i < 60; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 5 + Math.random() * 8;
      this.confetti.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 7,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 4 + Math.random() * 6,
        rotation: Math.random() * Math.PI,
        rotationSpeed: (Math.random() - 0.5) * 0.3,
        gravity: 0.35 + Math.random() * 0.2,
      });
    }
  }

  private drawNode(node: Node) {
    const ctx = this.ctx;

    // Glow
    const gradient = ctx.createRadialGradient(node.x, node.y, node.radius * 0.5, node.x, node.y, node.radius * 1.5);
    gradient.addColorStop(0, `${node.color}33`);
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(node.x, node.y, node.radius * 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Circle
    ctx.beginPath();
    ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = node.color;
    ctx.stroke();

    // Emoji
    ctx.font = `${node.radius}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(node.emoji, node.x, node.y);

    // Label
    ctx.font = "14px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillStyle = '#1C1C1E';
    ctx.fillText(node.label, node.x, node.y + node.radius + 18);
  }

  private drawEdge(from: Node, to: Node) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.strokeStyle = '#EFEFF4';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  private updateFlowDots() {
    const player = this.nodes.get('player');
    const company = this.nodes.get('company');
    if (!player || !company) return;

    const friendNodes = Array.from(this.nodes.values()).filter((n) => n.id.startsWith('friend-'));
    const expectedEdges = friendNodes.length * 2;

    // Maintain a fixed number of dots per edge
    while (this.flowDots.length < expectedEdges * 2) {
      this.flowDots.push({
        t: Math.random(),
        speed: 0.004 + Math.random() * 0.004,
        edgeIndex: Math.floor(this.flowDots.length / 2) % Math.max(1, friendNodes.length),
        direction: this.flowDots.length % 2 === 0 ? 'friend-company' : 'player-friend',
      });
    }

    // Trim excess dots if friends leave
    if (this.flowDots.length > expectedEdges * 2) {
      this.flowDots = this.flowDots.slice(0, expectedEdges * 2);
    }

    this.flowDots.forEach((dot) => {
      dot.t += dot.speed;
      if (dot.t > 1) dot.t = 0;

      const friend = friendNodes[dot.edgeIndex];
      if (!friend) return;

      const fromNode = dot.direction === 'player-friend' ? player : friend;
      const toNode = dot.direction === 'player-friend' ? friend : company;

      const x = fromNode.x + (toNode.x - fromNode.x) * dot.t;
      const y = fromNode.y + (toNode.y - fromNode.y) * dot.t;

      this.ctx.beginPath();
      this.ctx.arc(x, y, 3, 0, Math.PI * 2);
      this.ctx.fillStyle = '#2481CC';
      this.ctx.fill();
    });
  }

  private updateParticles() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life += 1;

      const alpha = 1 - p.life / p.maxLife;
      this.ctx.globalAlpha = Math.max(0, alpha);

      if (p.text) {
        this.ctx.font = "bold 14px 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', monospace";
        this.ctx.fillStyle = p.color;
        this.ctx.fillText(p.text, p.x, p.y);
      } else {
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        this.ctx.fillStyle = p.color;
        this.ctx.fill();
      }

      this.ctx.globalAlpha = 1;

      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
      }
    }
  }

  private updateConfetti() {
    for (let i = this.confetti.length - 1; i >= 0; i--) {
      const c = this.confetti[i];
      c.x += c.vx;
      c.y += c.vy;
      c.vy += c.gravity;
      c.rotation += c.rotationSpeed;

      this.ctx.save();
      this.ctx.translate(c.x, c.y);
      this.ctx.rotate(c.rotation);
      this.ctx.fillStyle = c.color;
      this.ctx.fillRect(-c.size / 2, -c.size / 2, c.size, c.size);
      this.ctx.restore();

      if (c.y > this.height + 50) {
        this.confetti.splice(i, 1);
      }
    }
  }

  draw() {
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.updateNodes();

    const player = this.nodes.get('player');
    const company = this.nodes.get('company');
    const friendNodes = Array.from(this.nodes.values()).filter((n) => n.id.startsWith('friend-'));

    // Draw edges first
    if (player && company) {
      friendNodes.forEach((friend) => {
        this.drawEdge(player, friend);
        this.drawEdge(friend, company);
      });
    }

    // Draw flow dots
    this.updateFlowDots();

    // Draw nodes
    if (player) this.drawNode(player);
    if (company) this.drawNode(company);
    friendNodes.forEach((friend) => this.drawNode(friend));

    // Update particles
    this.updateParticles();
    this.updateConfetti();
  }

  start() {
    const animate = () => {
      this.draw();
      this.rafId = requestAnimationFrame(animate);
    };
    this.rafId = requestAnimationFrame(animate);
  }

  destroy() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
    this.canvas.removeEventListener('click', this.handleClick as EventListener);
    window.removeEventListener('resize', this.handleResize as EventListener);
  }

  private handleClick = (e: MouseEvent) => {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if tapped player node
    const playerNode = this.nodes.get('player');
    if (playerNode) {
      const dx = x - playerNode.x;
      const dy = y - playerNode.y;
      if (dx * dx + dy * dy < (playerNode.radius + 20) ** 2) {
        this.onHustle?.();
        this.spawnHustleParticles();
        this.pulseNode('player');
        return;
      }
    }

    // Check if tapped company node for cash out
    const companyNode = this.nodes.get('company');
    if (companyNode) {
      const dx = x - companyNode.x;
      const dy = y - companyNode.y;
      if (dx * dx + dy * dy < (companyNode.radius + 20) ** 2) {
        if (this.state.user.credits >= 1000) {
          this.onCashOut?.();
        } else {
          showToast('Need 1,000 credits to cash out');
        }
        return;
      }
    }

    // Otherwise spawn click particles at tap
    this.spawnTapParticles(x, y);
  };
}


