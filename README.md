# Liquid Sort Puzzle

Small game using Capacitor for desktop-phone portability
Frontend: Vite+React+Capacitor
Backend/Server: Apollo Server+NodeJS

## Description

We finished producing the potions, but it seems we had a mixup when storing them.
Can you sort them out?
Only potions of the same color may be poured into the same bottle.
Empty bottles may get potions of any color.
Full bottles are ready for sale and thus shouldn't be reopened.

## Project Structure
```
liquid-sort-puzzle/
├── package.json (workspace root)
├── pnpm-workspace.yaml
├── apps/
│   ├── frontend/          (Vite + React + Capacitor)
│   └── server/            (Apollo Server + Node)
└── packages/
    └── shared/            (Pure TS game logic)
```

## Local Development

<TODO>
