#!/bin/bash
# ============================================================================
# CHECKPOINT.SH - Auto branch, stage, dan commit
# ============================================================================
# Cara update script ini (untuk AI):
# 1. Jalankan `git diff` dan `git diff --cached` untuk melihat semua perubahan
# 2. Jalankan `git status` untuk melihat file baru (untracked)
# 3. Identifikasi fitur utama dan fix dari diff, buat judul branch format:
#    feat/TMAIL-{DDMMYYHHMM}-{judul-kecil-yang-mewakili-keseluruhan}
# 4. Update BRANCH_NAME di bawah dengan judul yang sesuai
# 5. Tulis commit message yang mencakup:
#    - Baris pertama: ringkasan fitur utama + fix
#    - Paragraf kedua: detail poin-poin perubahan (bullet)
#    - Checkbox list untuk testing
# 6. Simpan file, user tinggal jalankan ./checkpoint.sh
# ============================================================================

TIMESTAMP=$(date +"%d%m%y%H%M")

BRANCH_NAME="fix/TMAIL-${TIMESTAMP}-production-public-origin-redirect"

if git rev-parse --verify "$BRANCH_NAME" >/dev/null 2>&1; then
  git checkout "$BRANCH_NAME"
else
  git checkout -b "$BRANCH_NAME"
fi

git add -A -- ':!/.pnpm-store' ':!/.pnpm-store/**'

COMMIT_MSG=$(cat <<'EOF'
fix: use public origin for production redirects

Main changes:
- add shared public-origin resolver using forwarded headers and production URL env fallbacks
- update auth middleware redirects so `/inbox`, `/signin`, and guest-only redirects no longer point to internal `localhost:8901`
- update guest email context redirect to return to the production public domain instead of the internal container host
- use the same secure-request detection for login, register, and admin session cookies behind reverse proxies
- document the supported backend domain env message with `NEXT_PUBLIC_API_URL`

Testing:
- [x] `./node_modules/.bin/tsc --noEmit`
- [x] `./node_modules/.bin/next build`
- [x] Production runtime `/api/guest-email-context` redirects to `https://app.thvuinin.my.id/` with internal `Host: localhost:8901`
- [x] Production runtime `/inbox` redirects to `https://app.thvuinin.my.id/signin` with forwarded production headers
- [ ] Verify redirect on the live production reverse proxy after redeploy
EOF
)

if git diff --cached --quiet; then
  echo ""
  echo "Branch ready: $(git branch --show-current)"
  echo "No staged changes to commit."
  exit 0
fi

git commit -m "$COMMIT_MSG"

echo ""
echo "Branch created: $BRANCH_NAME"
echo "Commit successful."
