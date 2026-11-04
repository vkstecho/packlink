/**
 * PackLink Admin — Unified Login Cloud Functions
 * --------------------------------------------
 * The app's login screen has ONE input box. Whatever the admin types there decides the path:
 *
 *   A) Types the admin PHONE (8929397949)
 *      -> normal Firebase Phone Auth SMS OTP happens entirely client-side (unchanged).
 *      -> once that OTP is confirmed, the client calls grantAdminIfPhoneVerified() here.
 *      -> we double-check the caller's Firebase Auth token really has phone_number === ADMIN_PHONE
 *         (this cannot be faked from the browser — it's set by Firebase itself after a real SMS
 *         OTP confirmation) and then set a real, server-side {admin:true} custom claim.
 *
 *   B) Types the admin EMAIL (packlink.vkstech@gmail.com) in the SAME box, instead of a phone number
 *      -> requestAdminEmailLoginOtp({email}) is called (no prior sign-in exists yet at this point,
 *         so this function does not require auth — but it only ever emails the one hardcoded
 *         ADMIN_EMAIL, regardless of what's passed in, and it's rate-limited).
 *      -> requestAdminEmailLoginOtp emails a 6-digit code to ADMIN_EMAIL.
 *      -> verifyAdminEmailLoginOtp({code}) checks the code. If correct, it creates (or reuses) a
 *         Firebase Auth user for that email, grants {admin:true}, and returns a custom auth token.
 *      -> the client calls signInWithCustomToken() with that token to establish a real session.
 *
 * Either path ends with the browser holding a Firebase Auth ID token carrying {admin:true} —
 * that claim is what your Realtime Database rules should check, not anything the client asserts
 * on its own.
 */

const {onCall, HttpsError} = require('firebase-functions/v2/https');
const {defineSecret} = require('firebase-functions/params');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

admin.initializeApp();

// One-time setup:
//   firebase functions:secrets:set GMAIL_USER   (value: packlink.vkstech@gmail.com)
//   firebase functions:secrets:set GMAIL_PASS   (value: a 16-character Gmail "App Password")
const gmailUser = defineSecret('GMAIL_USER');
const gmailPass = defineSecret('GMAIL_PASS');

const ADMIN_PHONE_E164 = '+918929397949'; // the real admin phone, E.164 (client no longer holds this value)
const ADMIN_EMAIL = 'packlink.vkstech@gmail.com'; // must match ADMIN_EMAIL in index.html
const OTP_TTL_MS = 5 * 60 * 1000;    // code valid for 5 minutes
const MIN_RESEND_GAP_MS = 45 * 1000; // don't allow re-sending more than once every 45s
const MAX_ATTEMPTS = 5;
const OTP_DB_PATH = 'adminEmailLoginOtp/main'; // single fixed slot — there is only ever one admin

function genCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// ── Path A: phone already verified via Firebase Phone Auth client-side ──
exports.grantAdminIfPhoneVerified = onCall({region: 'asia-south1'}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Login required.');
  }
  if (request.auth.token.phone_number !== ADMIN_PHONE_E164) {
    throw new HttpsError('failed-precondition', 'This phone is not authorized as admin.');
  }
  await admin.auth().setCustomUserClaims(request.auth.uid, {admin: true});
  return {success: true};
});

// ── Path B, step 1: email typed instead of phone ──
exports.requestAdminEmailLoginOtp = onCall(
  {region: 'asia-south1', secrets: [gmailUser, gmailPass]},
  async (request) => {
    const suppliedEmail = ((request.data && request.data.email) || '').toString().trim().toLowerCase();
    if (suppliedEmail !== ADMIN_EMAIL) {
      // Deliberately vague — never confirm/deny which emails are valid.
      throw new HttpsError('failed-precondition', 'Not authorized.');
    }

    const db = admin.database();
    const otpRef = db.ref(OTP_DB_PATH);
    const existing = (await otpRef.once('value')).val();
    const now = Date.now();
    if (existing && existing.lastSentAt && now - existing.lastSentAt < MIN_RESEND_GAP_MS) {
      throw new HttpsError('resource-exhausted', 'Please wait a bit before requesting another code.');
    }

    const code = genCode();
    await otpRef.set({
      code,
      createdAt: now,
      expiresAt: now + OTP_TTL_MS,
      lastSentAt: now,
      attempts: 0,
    });

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {user: gmailUser.value(), pass: gmailPass.value()},
    });

    await transporter.sendMail({
      from: `"PackLink Admin Security" <${gmailUser.value()}>`,
      to: ADMIN_EMAIL,
      subject: 'PackLink Admin Login Code',
      text: `Your admin login code is: ${code}\n\nExpires in 5 minutes. If you did not request this, you can ignore it.`,
    });

    return {success: true};
  }
);

// ── Path B, step 2: verify the emailed code, then hand back a sign-in token ──
exports.verifyAdminEmailLoginOtp = onCall({region: 'asia-south1'}, async (request) => {
  const code = ((request.data && request.data.code) || '').toString();
  const db = admin.database();
  const otpRef = db.ref(OTP_DB_PATH);
  const record = (await otpRef.once('value')).val();

  if (!record) {
    throw new HttpsError('failed-precondition', 'No code requested. Please request a new one.');
  }
  if (Date.now() > record.expiresAt) {
    await otpRef.remove();
    throw new HttpsError('deadline-exceeded', 'Code expired. Please request a new one.');
  }
  if ((record.attempts || 0) >= MAX_ATTEMPTS) {
    await otpRef.remove();
    throw new HttpsError('resource-exhausted', 'Too many wrong attempts. Please request a new code.');
  }
  if (record.code !== code) {
    await otpRef.update({attempts: (record.attempts || 0) + 1});
    throw new HttpsError('invalid-argument', 'Incorrect code.');
  }

  // Correct. Clean up the OTP and issue a real session for the admin email account.
  await otpRef.remove();

  let userRecord;
  try {
    userRecord = await admin.auth().getUserByEmail(ADMIN_EMAIL);
  } catch (e) {
    userRecord = await admin.auth().createUser({email: ADMIN_EMAIL, emailVerified: true});
  }
  await admin.auth().setCustomUserClaims(userRecord.uid, {admin: true});
  const token = await admin.auth().createCustomToken(userRecord.uid, {admin: true});

  return {success: true, token};
});

// ── Manager role (admin-only) ──
// The Admin Panel already writes {role:'manager'} to the user's DB record directly
// (admin has full DB write access). This function additionally grants/revokes a real,
// server-verified custom claim on that manager's actual Firebase Auth account, which is
// what the Realtime Database rules check before letting a "manager" write other members'
// records. Without this, {role:'manager'} would only be a cosmetic DB field with nothing
// stopping a non-manager from writing that field into their own record via the raw API.
exports.setManagerRole = onCall({region: 'asia-south1'}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Login required.');
  }
  if (request.auth.token.admin !== true) {
    throw new HttpsError('permission-denied', 'Only admin can grant/revoke manager role.');
  }
  const targetAuthUid = (request.data && request.data.targetAuthUid || '').toString();
  const make = !!(request.data && request.data.make);
  if (!targetAuthUid) {
    throw new HttpsError('invalid-argument', 'Missing target user.');
  }
  await admin.auth().setCustomUserClaims(targetAuthUid, make ? {manager: true} : {manager: false});
  return {success: true};
});
