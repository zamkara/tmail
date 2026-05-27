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

BRANCH_NAME="feat/TMAIL-${TIMESTAMP}-guest-otp-websocket-logo-footer"

if git rev-parse --verify "$BRANCH_NAME" >/dev/null 2>&1; then
  git checkout "$BRANCH_NAME"
else
  git checkout -b "$BRANCH_NAME"
fi

git add -A

COMMIT_MSG=$(cat <<'EOF'
feat: improve guest realtime otp, logo, and request flow

Main changes:
- use backend OTP payload directly for guest inbox items and websocket updates
- keep OTP copy available from the guest list without opening messages first
- reduce guest inbox refresh flicker with silent background polling
- remove guest detail prefetch that caused excessive `/api/inbox/{id}` hits
- dedupe and smooth guest domain loading so the switcher reuses loaded store data
- replace the guest header text with `public/logo.png`
- keep the global footer as plain text and avoid scroll/layout issues
- keep domain seed sync aligned with the Mongo unique key

Testing:
- [x] `pnpm typecheck`
- [ ] Guest inbox shows OTP on list items when backend returns `otp`
- [ ] Guest websocket updates show OTP without opening the message
- [ ] Guest message click does not trigger a visible loading flash
- [ ] Guest domains load once and do not spam duplicate fetch errors
- [ ] Footer stays as plain text on all pages
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
