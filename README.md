# Ledger

**A Telegram-style web game where you build companies with friends and cash out weekly.**

🎮 **Play:** https://clankey88.github.io/ledger-game  
📦 **Repo:** https://github.com/clankey88/ledger-game

You are a Ledger in a world run by businesses. Create a company, invite friends, earn credits, and convert them to money every Sunday.

![Ledger screenshot](./public/screenshot.png)
> Replace `./public/screenshot.png` with a real screenshot once you deploy.

## Quick Start

```bash
cd ledger-game
npm install
npm run dev
```

Open `http://localhost:5173/` in your browser.

## How to Play

1. **Create your Ledger** — pick a name and avatar.
2. **Incorporate a company** — choose an industry.
3. **Earn credits** — passively over time, by tapping "Hustle", or completing tasks.
4. **Invite friends** — each friend boosts your company's multiplier.
5. **Cash out weekly** — credits convert to money at the end of each week.

## Tech Stack

- Vite + TypeScript
- GSAP for animations
- Vanilla CSS (Telegram-inspired, anti-AI-slop design)
- localStorage for offline-first saves

## Design Notes

- Telegram blue + paper tones, no generic gradients
- Hand-drawn SVG doodles
- Snappy elastic animations
- Clean, minimal UI without glassmorphism

## Publicize on Instagram — Hooks & Captions

Use these hooks to promote Ledger on Instagram Reels, Stories, and posts.

### Reel Hook Ideas

1. "POV: you started a company with your friends and now your phone prints money every Sunday."
2. "I made $0.01 in 30 seconds and I've never felt more powerful."
3. "Stop scrolling. Start your ledger."
4. "This game pays you to build companies with your friends."
5. "My friends and I built a startup in 60 seconds. Here's how much we made."

### Caption Templates

**Template 1 — Relatable**
> Broke? Bored? Build a company with your friends and cash out weekly. Link in bio. 🪙

**Template 2 — Curiosity**
> This web game turned my group chat into a startup. Week 1 earnings inside 👀

**Template 3 — Urgency**
> New week starts Monday. Start stacking credits now so you can cash out Sunday.

**Template 4 — Meme**
> When your side hustle is literally a game and your friends are your employees.

### Story Ideas

- Screenshot your payout screen and post to Stories with "Sunday checks hit different "
- Record yourself tapping "Hustle" with "This is my new morning routine"
- Post the countdown to Sunday payout with "3 days until rent money 🪙"

### Hashtag Mix

Use a mix of broad and niche tags:

```
#sidehustle #passiveincome #startup #gaming #webgame #telegram #moneymakingapps #onlineearning #indiegame #playtoearn #friendshipgoals #moneytok
```

## Build for Production

```bash
npm run build
```

The `dist/` folder will contain the static assets ready for any static host.

## Deploy

### Vercel (recommended)

```bash
npm i -g vercel
vercel --prod
```

### GitHub Pages

```bash
npm run deploy
```

### Netlify

Drag and drop the `dist/` folder into Netlify or use the CLI:

```bash
npx netlify deploy --prod --dir=dist
```

## Roadmap

- [ ] Backend + real money payouts
- [ ] Persistent friend invites via referral links
- [ ] Weekly leaderboards
- [ ] Push notifications for payout day
- [ ] More industries and upgrades

## License

MIT
