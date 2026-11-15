# PackLink 3.7

## Critical fix
- Stuck green splash / slow load / cannot log in
- Caused by: service worker serving old JS + auth waiting on slow Firestore

## After deploy — one-time for testers
1. Open site → DevTools → Application → Clear site data (or hard refresh Ctrl+Shift+R)
2. Or: chrome://settings/siteData → remove packlink.vkstech.com
3. Reopen and Log in

Deploy: index.html, css/, js/, sw.js, firestore.rules
