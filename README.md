# MyCards

Android app for managing loyalty cards – scan, store locally, and present barcodes quickly.
Built with Capacitor, Angular and Ionic (TypeScript).

## Documentation

Architecture (arc42): [docs/architecture/arc42.md](docs/architecture/arc42.md)
Architecture decisions: [docs/architecture/adr/](docs/architecture/adr/)

Every implementation step must reference the relevant arc42 section or ADR.

## Development

Requirements: Node.js (version in `.nvmrc`), JDK 21, Android SDK (platform 34+).

```bash
npm ci
npm start                   # web dev server
npm run lint                # ESLint + Prettier
npm test                    # unit (Vitest) and e2e (Playwright) tests
npm run test:coverage       # unit tests with coverage report in coverage/app/ (goal: 80 % lines)
npm run android:build:debug # debug APK in android/app/build/outputs/apk/debug/
```

Source code layout: arc42 section 5.2.

## License

GNU General Public License v3 or later (`GPL-3.0-or-later`) – see [LICENSE](LICENSE).
