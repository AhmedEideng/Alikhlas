#!/usr/bin/env bash
# تثبيت Chromium لمحرك Playwright مع إعادة محاولة عند تعطّل مستودع apt المؤقت
set -uo pipefail

for attempt in 1 2 3; do
  echo "▶ playwright install --with-deps chromium (محاولة ${attempt}/3)"
  if npx playwright install --with-deps chromium; then
    echo "✓ Chromium جاهز"
    exit 0
  fi
  echo "✗ المحاولة ${attempt} فشلت — تنظيف أقفال apt والمحاولة من جديد"
  sudo rm -f /var/lib/apt/lists/lock \
    /var/cache/apt/archives/lock \
    /var/lib/dpkg/lock-frontend \
    /var/lib/dpkg/lock 2>/dev/null || true
  sudo dpkg --configure -a >/dev/null 2>&1 || true
  sleep $((attempt * 15))
done

echo "✗ تعذّر تثبيت Chromium بعد 3 محاولات"
exit 1
