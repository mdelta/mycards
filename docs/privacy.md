# MyCards privacy policy

Last updated: 2026-11-26

MyCards is a free, open-source Android app for loyalty cards. This policy explains which data the
app handles and where it goes.

## Summary

- MyCards has no account and no server of its own. Your cards stay on your phone.
- The MyCards developer does not receive, sell or share your card data.
- Google's barcode scanner, which MyCards uses, sends usage metrics to Google. These metrics don't
  contain your cards, camera images or barcode values.
- Crash reports and usage data are off unless you turn them on. They never contain your cards.

## Data stored on your phone

MyCards stores the cards you add: store name, card ID, barcode, notes, tags, color, icon, websites
and photos. It also stores your settings, such as the color theme. All of this is kept in the app's
private storage on your phone. Other apps can't read it. Uninstalling MyCards deletes it.

## Export and import

MyCards writes an export file only when you ask for it. You choose where the file goes, for example
another app or a cloud drive, using Android's share sheet. You can protect the file with a
password (AES-256). Exports contain your cards, not your settings. Import reads only the file you
pick.

## Android backup

Android may back up the app's data, including your cards and photos, to your Google account. This
depends on your phone's backup settings and is handled by Google under the
[Google Privacy Policy](https://policies.google.com/privacy). You can turn backup off in Android's
settings.

## Barcode scanner

Scanning uses Google's code scanner, which runs in Google Play services. MyCards doesn't get access
to the camera. Camera images and barcode values are processed on your phone and are not sent
anywhere.

The scanner's libraries (Google ML Kit) send diagnostics and usage metrics to Google: device
information, app package name and version, a per-installation identifier, performance metrics, API
configuration, event types and error codes. See Google's
[ML Kit data disclosure](https://developers.google.com/ml-kit/android-data-disclosure) and
[ML Kit terms](https://developers.google.com/ml-kit/terms).

## Photos

Card photos come from your camera app or Android's photo picker. MyCards stores a compressed copy in
its private storage. It doesn't need permission to access your camera or your photo library.

## Websites and shop search

When you open a card's website or search for a shop, MyCards hands the link or the search term to
your browser or map app. That app's privacy policy applies from then on.

## Crash reports and usage data

MyCards can send crash reports and usage data to help improve the app. Both are **off by default**
and have separate switches under Settings. Before a switch turns on, the app lists what is sent.

The data goes to [Sentry](https://sentry.io) (Functional Software, Inc.), stored in its EU data
region, under the [Sentry Privacy Policy](https://sentry.io/privacy/). Sentry is told not to store
IP addresses.

- **Crash reports:** when an error occurs in the app's code: the error type and message, with card
  content, quoted text and longer numbers removed; where in the app's code the error happened; app
  version, Android version, phone model and manufacturer.
- **Usage data:** once a week: number of cards, cards per barcode type, number of tags and photos,
  how often you scanned, added, showed, exported and imported cards; app version, Android version,
  phone model and manufacturer.

Never sent: store names, card IDs, barcode values, notes, photos, tag names, websites or any other
card content, and no account or advertising identifier. Every report MyCards sends is kept on your
phone and shown under Settings → Sent data (the latest 20). Turning a switch off stops sending
immediately. The legal basis is your consent (Art. 6(1)(a) GDPR), which you can withdraw at any time
by turning the switch off.

## Your choices

You can view, edit and delete your cards in the app at any time. Uninstalling the app or clearing
its data in Android's settings deletes everything MyCards stored on your phone. For data processed
by Google, see the [Google Privacy Policy](https://policies.google.com/privacy).

## Changes

Changes to this policy are published on this page and in the app. The full history is in the
[source code repository](https://github.com/mdelta/mycards).

## Contact

Questions about privacy: <mailto:privacy-policy@orisian.de>
