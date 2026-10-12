# SpinCoach

SpinCoach is a fan-made training tool for spinning-top players. It runs in the browser. There is no server. It stores launch history, spin times, a shout recording, and battle scores in `localStorage`.

It is not affiliated with Takara Tomy, Hasbro, or any toy brand.

## What you can do

- Log shoot power (SP) from a BX-09 Battle Pass over Web Bluetooth.
- When Bluetooth is missing, a 3 second phone motion estimates SP.
- If you refuse the motion sensor, there is no SP reading.
- Time how long a top spins.
- Record a launch shout, or play a built-in countdown.
- Run a two-player longest-spin battle.
- Switch the language with **English** and **繁體中文**. The button labels stay those words in both languages.

Web Bluetooth works in Chrome or Edge on Android or desktop, on HTTPS or localhost. iPhone and iPad browsers do not offer Web Bluetooth, so motion estimates SP. A refused motion sensor has no SP path.

This build has not been tested against a physical BX-09. Packet parsing follows the reverse-engineered layout in [BeyMeter](https://github.com/bahamutonX/BeyMeter) (MIT) and [Beyblade-BattlePass-BLE-Simulator](https://github.com/MarkChan0225/Beyblade-BattlePass-BLE-Simulator).

## Run locally

You need Node.js 22 or newer.

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:43147`.

## Tests

```bash
npm test
npm run test:e2e
```

`npm test` checks BLE packet parsing and the motion rest rule. `npm run test:e2e` is a headless phone-sized smoke test of the four screens and the Traditional Chinese switch. It fails if the page logs a console error.

## Build and deploy

```bash
npm run build
```

That writes static files to `dist/`. Copy that folder to any static HTTPS host (GitHub Pages, Netlify, Cloudflare Pages, nginx, S3). Web Bluetooth is blocked on plain HTTP except localhost.

If the app is not at the domain root, set the Vite `base` in `vite.config.ts` to that path, then build again.

## Credits

Battle Pass notify UUIDs and packet layout were documented by open-source projects under MIT or similar terms. SpinCoach reimplements the parser and does not copy those apps' UI or assets.
