# Security Policy — Al Ikhlas Medical

## Supported Versions

| Version | Supported      |
| ------- | -------------- |
| latest  | ✅ Active      |
| < 1.0   | ❌ End of life |

## Reporting a Vulnerability

If you discover a security vulnerability in **Al Ikhlas Medical**, please report it responsibly:

- **Email:** security@alikhlasmedical.store
- **WhatsApp:** https://wa.me/201000000000 (mention "security report")

## Security Architecture

| Layer                  | Mechanism                                                                              |
| ---------------------- | -------------------------------------------------------------------------------------- |
| **CSP**                | `config/security-headers.mjs` synced with `vercel.json` + `server/index.js`            |
| **HSTS**               | `max-age=63072000; includeSubDomains; preload`                                         |
| **CORS**               | Strict origin allowlist (`alikhlasmedical.store` + `SITE_URL`)                         |
| **Rate Limiting**      | In-process IP limit (hashed) + Google Apps Script per-phone limit                      |
| **Price Validation**   | Server-side lookup against `products-db.json`                                          |
| **Input Sanitization** | XSS stripping, formula injection guard, prototype pollution protection                 |
| **PII Protection**     | Zero PII stored in `localStorage`; `sessionStorage` stores `ikhlas_last_order_id` only |
| **Security.txt**       | `/.well-known/security.txt` + `/security.txt`                                          |
