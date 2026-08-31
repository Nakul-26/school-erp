# Credentials & Config Checklist — Before Go-Live

Running list of external accounts/keys and production config values needed before handing
this app to a real school. Nothing in the code is fake or stubbed for these — they just need
real values plugged in. Fill in the "Value" column when ready, then ask to have them wired in
(local: `erp-backend/.dev.vars`; production: `wrangler secret put <NAME>`).

## A. External service credentials (need a signup)

| # | Name | What it's for | Where to get it | Required? | Value |
|---|------|----------------|------------------|-----------|-------|
| 1 | `RESEND_API_KEY` | Sending real emails (password reset, notifications, receipts) | [resend.com](https://resend.com) — free tier available | Yes | |
| 2 | SMS provider (Fast2SMS / MSG91 / Twilio — pick one) | SMS notifications (fee dues, attendance, results) | Sign up with chosen provider, get API key. Configured per-institution in-app under **Integration Center** — not an env var | No, but expected by a school | Provider: ____  Key: |
| 3 | Payment gateway (Razorpay or Stripe) | Online fee payment by parents | [razorpay.com](https://razorpay.com) or [stripe.com](https://stripe.com) — start with sandbox/test keys | Not built yet — this feature is on hold until keys are provided, then I'll wire it in | Sandbox key: ____  Secret: |

## B. Internal secrets (self-generated, no external account needed)

These don't need a signup — just a strong random value. Say the word and I'll generate these directly.

| # | Name | What it's for | Required? | Value |
|---|------|----------------|-----------|-------|
| 4 | `JWT_SECRET` | Signs login session tokens | Yes | |
| 5 | `INSTITUTION_INVITE_SECRET` | Invite code gating self-service institution signup (only matters if schools can register themselves) | Only if self-registration is enabled | |
| 6 | `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Browser push notifications | No — only if you want push notifications | |

## C. Production config values (not secrets, but need the real deployed URLs)

| # | Name | What it's for | Value |
|---|------|----------------|-------|
| 7 | `FRONTEND_URL` | Used in password-reset emails to build the reset link | e.g. `https://yourschool.trackflow.app` |
| 8 | `FRONTEND_ORIGIN` | CORS allow-list — must match the real frontend domain(s), comma-separated if more than one | |

## D. Not a credential, but a decision needed

- **Which SMS provider** the school wants to use (item 2) — affects what account they need to open.
- **Razorpay vs Stripe** for payments (item 3) — Razorpay is more common for Indian schools; Stripe if international.

---
*Created 2026-08-03. Update this file as values are decided — nothing needs to be filled in until you're ready.*
