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

BRANCH_NAME="feat/TMAIL-${TIMESTAMP}-guest-dark-theme-inbox-polish"

if git rev-parse --verify "$BRANCH_NAME" >/dev/null 2>&1; then
  git checkout "$BRANCH_NAME"
else
  git checkout -b "$BRANCH_NAME"
fi

git add -A

COMMIT_MSG=$(cat <<'EOF'
feat: polish guest dark theme, inbox detail, and otp effects

Main changes:
- switch the app font to Inter from `rsms.me`
- refresh dark mode tokens for popovers, sidebars, inbox surfaces, command menus, and toast notifications
- recolor guest logo with theme-aware masking so light mode uses primary and dark mode stays white
- add guest background click fade-out with delayed slow fade-in recovery
- use `#443d8d` for the guest aurora effect when new OTP messages arrive
- keep guest delete buttons and inbox delete controls on explicit `#fb2c36` styling instead of destructive variants
- tighten `/inbox/.../[messageId]` email detail spacing and preserve original email body colors in dark mode
- add `allowedDevOrigins` for the Cloudflare dev tunnel

Testing:
- [x] `pnpm typecheck`
- [ ] Guest domain picker, dialogs, dropdowns, and toasts match the dark theme
- [ ] Guest background animation fades out on background click and fades in after 5 seconds
- [ ] Guest OTP arrival uses the `#443d8d` visual effect
- [ ] `/inbox` sidebars use the `#141414` surface with matching border/accent colors
- [ ] `/inbox/.../[messageId]` email detail appears compact and keeps original email body colors
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
