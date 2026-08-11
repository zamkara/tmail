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

BRANCH_NAME="fix/TMAIL-${TIMESTAMP}-guest-domain-loading-production"

if git rev-parse --verify "$BRANCH_NAME" >/dev/null 2>&1; then
  git checkout "$BRANCH_NAME"
else
  git checkout -b "$BRANCH_NAME"
fi

git add -A -- ':!/.pnpm-store' ':!/.pnpm-store/**'

COMMIT_MSG=$(cat <<'EOF'
fix: stabilize guest domain loading in production

Main changes:
- load guest domains from the existing Mongo/backend email API logic instead of dummy mock domains
- support production backend env compatibility via `EMAIL_API_URL`, `NEXT_PUBLIC_EMAIL_API_URL`, or `NEXT_PUBLIC_API_URL`
- prevent guest first-load domain loading from getting stuck under React Strict Mode cleanup/retry behavior
- add domain request timeout, explicit domain load error state, and retry action instead of leaving the UI on `Loading domains...`
- keep inbox API routes on the same backend URL resolver as domain loading

Testing:
- [x] `./node_modules/.bin/tsc --noEmit`
- [x] `./node_modules/.bin/next build`
- [x] Production runtime `/api/domains` returns real domains quickly and does not return `tmail.io`, `tmpbox.net`, or `throwmail.dev`
- [x] Production runtime `/api/app-settings` and `/` return 200
- [ ] Verify guest homepage in a fresh browser session auto-generates an address without manual refresh
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
