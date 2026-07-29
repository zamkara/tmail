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

BRANCH_NAME="feat/TMAIL-${TIMESTAMP}-avatar-branding-guest-polish"

if git rev-parse --verify "$BRANCH_NAME" >/dev/null 2>&1; then
  git checkout "$BRANCH_NAME"
else
  git checkout -b "$BRANCH_NAME"
fi

git add -A

COMMIT_MSG=$(cat <<'EOF'
feat: add avatar presets and polish guest branding flow

Main changes:
- add profile avatar preset selection with only `Prem-Cute.webp` and `Prem-King.webp`
- persist selected avatar across refresh by serializing `avatarPreset` through auth payloads and client store hydration
- add authenticated profile update API and wire preference form save flow to persist name, email, password, and avatar preset
- restrict sign up email domains to `gmail.com`, `hotmail.com`, and `outlook.com` with server-side validation
- update auth form placeholders and keep unsupported email feedback only in notifications
- polish guest branding by resizing guest banners, linking top-left brand icons back to home, and making footer `Premiumisme` open Telegram
- refine inbox sidebar brand icon sizing so the logo no longer looks cropped or misaligned
- include new branding and avatar assets used by guest pages and user settings

Testing:
- [x] `pnpm typecheck`
- [ ] Verify profile avatar selection saves and still appears after browser refresh
- [ ] Verify only `gmail.com`, `hotmail.com`, and `outlook.com` can register
- [ ] Verify guest brand icon and inbox sidebar icon both navigate back to home
- [ ] Verify guest banners render at the intended size in light and dark modes
- [ ] Verify footer `Premiumisme` link opens `https://t.me/premiumisme`
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
