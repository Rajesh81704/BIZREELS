# Environment Variables & API Keys Reference

The application requires specific runtime configurations configured in `.env` files located in the root directories of `backend` and `frontend`.

---

## 1. Backend Configuration (`backend/.env`)

### Server & Networking
| Variable Name | Required | Example / Default | Description |
| :--- | :--- | :--- | :--- |
| **`PORT`** | Yes | `5000` | The network port the Express application server listens on (default: `5000`). |
| **`NODE_ENV`** | Yes | `development` | The runtime environment (`development`, `production`, `test`). |
| **`CLIENT_URL`** | Yes | `http://localhost:5173` | Allowed frontend client URL for CORS headers and cookie domains. |
| **`APP_URL`** | No | `http://localhost:5000` | Base public server URL (used for webhooks and callback resolution). |

### Database & Cache
| Variable Name | Required | Example / Default | Description |
| :--- | :--- | :--- | :--- |
| **`MONGODB_URI`** | Yes | `mongodb+srv://...` | MongoDB connection URI (Atlas connection string or local `mongodb://localhost:27017/bizreels`). |
| **`DB_NAME`** | No | `bizreels` | Target database name inside MongoDB cluster. |
| **`REDIS_ENABLED`** | Yes | `true` | Toggles distributed Redis caching for telemetry, rate limits, and offers. |
| **`REDIS_URL`** | Conditional | `rediss://...` | Full Redis connection URI (e.g. Upstash Redis `rediss://...`). |
| **`REDIS_HOST`** | Conditional | `suitable-parakeet-...upstash.io` | Redis host domain. |
| **`REDIS_PORT`** | Conditional | `6379` | Redis port number. |
| **`REDIS_PASSWORD`** | Conditional | `<secret-token>` | Redis authentication token / password. |
| **`REDIS_TLS`** | Conditional | `true` | Enables TLS for secure remote Redis connection. |

### Authentication & JWT
| Variable Name | Required | Example / Default | Description |
| :--- | :--- | :--- | :--- |
| **`JWT_ACCESS_SECRET`** | Yes | `<secret-key>` | Secret key used to sign short-lived access tokens. |
| **`JWT_REFRESH_SECRET`** | Yes | `<secret-key>` | Secret key used to sign long-lived refresh tokens. |
| **`JWT_ACCESS_EXPIRY`** | Yes | `30m` | Access token lifespan string (e.g., `30m`, `1h`). |
| **`JWT_REFRESH_EXPIRY`** | Yes | `7d` | Refresh token lifespan string (e.g., `7d`, `30d`). |

### AI & LLM Engine (OpenRouter)
| Variable Name | Required | Example / Default | Description |
| :--- | :--- | :--- | :--- |
| **`OPENROUTER_API_KEY`** | Yes | `sk-or-v1-...` | API Key for OpenRouter API (used for specification generation and AI assist). |
| **`OPENROUTER_MODEL`** | No | `openrouter/free` | Primary model identifier (e.g., `google/gemini-2.5-flash`, `openrouter/free`). |

### Media Storage (Cloudinary CDN)
| Variable Name | Required | Example / Default | Description |
| :--- | :--- | :--- | :--- |
| **`CLOUDINARY_CLOUD_NAME`** | Yes | `<cloud-name>` | Cloudinary account identifier for direct CDN streaming. |
| **`CLOUDINARY_API_KEY`** | Yes | `<api-key>` | Cloudinary REST API key for signature generation (`/api/v1/media/sign`). |
| **`CLOUDINARY_API_SECRET`** | Yes | `<api-secret>` | Cloudinary secret used to sign edge upload payloads. |
| **`STORAGE_PROVIDER`** | No | `cloudinary` | Storage backend driver (`cloudinary` or `local`). |
| **`MAX_UPLOAD_SIZE`** | No | `10485760` | Maximum single media upload size in bytes (10MB default). |
| **`CLOUDINARY_DEV_MODE`** | No | `false` | When `true`, saves media assets in temporary testing folder. |

### Payments & Subscriptions (Razorpay)
| Variable Name | Required | Example / Default | Description |
| :--- | :--- | :--- | :--- |
| **`RAZORPAY_KEY_ID`** | Yes | `rzp_test_...` | Razorpay public Key ID for client checkout initialization. |
| **`RAZORPAY_KEY_SECRET`** | Yes | `<secret-key>` | Razorpay Secret Key for HMAC signature verification and order generation. |
| **`RAZORPAY_DEV_MODE`** | No | `false` | When `true`, bypasses payment gateway for rapid sandbox testing. |

### SMS, OTP & WhatsApp (Twilio DLT)
| Variable Name | Required | Example / Default | Description |
| :--- | :--- | :--- | :--- |
| **`SMS_PROVIDER`** | Yes | `twilio` | Provider selector for SMS/OTP (`twilio` or `msg91`). |
| **`TWILIO_ACCOUNT_SID`** | Yes | `AC...` | Twilio Account SID for transactional SMS and WhatsApp. |
| **`TWILIO_AUTH_TOKEN`** | Yes | `<auth-token>` | Twilio Auth Token credential. |
| **`TWILIO_MESSAGING_SERVICE_SID`** | No | `MG...` | Twilio Messaging Service SID. |
| **`TWILIO_WHATSAPP_FROM`** | No | `whatsapp:+1555...` | Twilio WhatsApp sender number. |
| **`TWILIO_WHATSAPP_CONTENT_SID`** | No | `HX...` | Approved WhatsApp template Content SID for OTP delivery. |
| **`OTP_EXPIRY_MINUTES`** | No | `5` | Lifespan of numeric verification codes in minutes. |
| **`OTP_MAX_ATTEMPTS`** | No | `5` | Maximum failed verification attempts before cooldown. |
| **`OTP_DEV_MODE`** | No | `false` | When `true`, bypasses SMS delivery and logs OTP to server console. |

### Transactional Email (Resend API)
| Variable Name | Required | Example / Default | Description |
| :--- | :--- | :--- | :--- |
| **`RESEND_API_KEY`** | Yes | `re_...` | API Key for Resend email delivery engine. |
| **`RESEND_FROM_EMAIL`** | Yes | `BizReels <admin@bidzord.com>` | Verified sender address for transactional notifications. |

### KYC Identity Verification (Sandbox.co.in)
| Variable Name | Required | Example / Default | Description |
| :--- | :--- | :--- | :--- |
| **`SANDBOX_API_KEY`** | Yes | `key_live_...` | Sandbox.co.in API Key for PAN, Aadhaar, GSTIN, and Bank verification. |
| **`SANDBOX_API_SECRET`** | Yes | `secret_live_...` | Sandbox.co.in API Secret signature key. |
| **`SANDBOX_BASE_URL`** | No | `https://api.sandbox.co.in` | Base URL for Sandbox government verification endpoints. |

### Telephony (Exotel Click-to-Call)
| Variable Name | Required | Example / Default | Description |
| :--- | :--- | :--- | :--- |
| **`EXOTEL_SID`** | Yes | `<sid>` | Exotel Account SID for initiating vendor-customer call bridging. |
| **`EXOTEL_API_KEY`** | Yes | `<api-key>` | Exotel API Key for REST authentication. |
| **`EXOTEL_API_TOKEN`** | Yes | `<api-token>` | Exotel API Token for REST authentication. |
| **`EXOTEL_PHONE`** | Yes | `0XXXXXXXXXX` | Virtual Landline / Caller ID allocated for call proxying. |
| **`EXOTEL_API_BASE_URL`** | No | `https://api.exotel.com` | Exotel REST base URL. |

### Google OAuth & Integration
| Variable Name | Required | Example / Default | Description |
| :--- | :--- | :--- | :--- |
| **`GOOGLE_CLIENT_ID`** | No | `...apps.googleusercontent.com` | Google OAuth Client ID for Social Login. |
| **`GOOGLE_CLIENT_SECRET`** | No | `<secret>` | Google OAuth Client Secret. |
| **`GOOGLE_CALLBACK_URL`** | No | `http://localhost:5000/api/v1/auth/google/callback` | OAuth redirect URI registered in Google Cloud Console. |

### Admin Seeding & Overrides
| Variable Name | Required | Example / Default | Description |
| :--- | :--- | :--- | :--- |
| **`SEED_ADMIN_ON_STARTUP`** | No | `true` | Automatically seeds the primary admin account if not found on launch. |
| **`ADMIN_SEED_PHONE`** | No | `9634372352` | Admin phone number initialized during bootstrap. |
| **`DEV_ADMIN_OVERRIDE_TOKEN`** | No | `<secret-token>` | Secret token for developer backdoor authentication in local testing. |

---

## 2. Frontend Configuration (`frontend/.env`)

| Variable Name | Required | Default / Value | Description |
| :--- | :--- | :--- | :--- |
| **`VITE_BACKEND_URL`** | Yes | `http://localhost:5000` | Target backend Express API server base URL. |
| **`VITE_API_URL`** | No | `http://localhost:5000/api/v1` | Explicit REST API prefix override (defaults to `/api/v1` via Vite proxy). |
| **`VITE_SOCKET_URL`** | No | `http://localhost:5000` | Realtime Socket.io server connection URL. |
| **`VITE_GOOGLE_MAPS_API_KEY`** | Yes | `AIzaSy...` | Google Maps Platform JavaScript API Key for location picker and autocomplete. |
| **`VITE_GOOGLE_CLIENT_ID`** | No | `<client-id>` | Google OAuth Client ID for Google Social Sign-In on client. |
| **`VITE_CLOUDINARY_CLOUD_NAME`** | No | `<cloud-name>` | Cloudinary bucket identifier for client-side direct upload presets. |

