# Neuro-Adapt — Sphere Trainer

A 3D cognitive-motor training system built with React Three Fiber. Players react to
colour-coded spheres (swipe, hold, or inhibit) across adaptive difficulty modes, plus a
set of standalone mini-games. Performance is scored as a **CMCI** (Cognitive-Motor
Coupling Intelligence) index derived from reaction time, accuracy, and drift.

## Modes

- **Micro-Reach** — baseline cognitive-motor assessment
- **Rule-Switch** — colour-action mappings shift mid-session
- **Inhibition** — suppress responses to distractors and red targets
- **Trajectory** — motor precision under increasing speed
- **Dual-Task** — rule-switching combined with spatial tracking

## Mini-games

Neural Grid (pattern memory), Signal Trace (node sequencing), Reflex Gate (portal
timing), Cogni Stack (card memory), and Geometric Draw (Kolam sand art / precision
drawing).

## Adaptive difficulty

Session parameters (object speed, target size, spawn delay, cognitive load) adjust in
real time based on accuracy, reaction time, and detected fatigue. A **relaxed pace**
setting is available for gentler starting difficulty.

## Settings & accessibility

- Adjustable UI text scale and a high-contrast mode
- Reduced-motion toggle to disable UI animations
- Session history (CMCI trend and best mini-game scores) persisted locally

## Development

```bash
npm install
npm run dev          # start dev server
npm run build         # type-check + production build
npm run build:single  # bundle into a single-file HTML build
npm run lint
```

Built with React 19, Vite, @react-three/fiber, three.js, zustand, and Tailwind CSS.
Ships as an installable, offline-capable PWA.
