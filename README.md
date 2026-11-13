# PackLink 3.0

Members-only network for the Indian flexible packaging industry — jobs, group chats, member directory, and resume tools.

## What’s new in 3.0
- Fixed “Your current role” layout on Profile (labels and values were stuck together)
- Global key-value (`.kv`) styles shared by Profile and member detail sheets

See `CHANGELOG-improvements.md` for the full list of earlier improvements.

## Tech stack
- Vanilla HTML / CSS / JS (PWA)
- Firebase (Auth, Firestore, Storage)
- Deployed as static site + Cloud Functions

## Local development
Open `index.html` via any static server (or use the Firebase emulator if you have credentials configured).

## Deploy
1. Deploy `firestore.rules` and `storage.rules`
2. Deploy the web assets (`index.html`, `css/`, `js/`, `Assets/`, etc.)
3. Deploy Cloud Functions if changed

## Notes
- CTC fields are private (visible only to the member and admins)
- App is intended for verified packaging-industry professionals
