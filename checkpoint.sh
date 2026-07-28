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

BRANCH_NAME="feat/TMAIL-${TIMESTAMP}-admin-auth-branding-updates"

if git rev-parse --verify "$BRANCH_NAME" >/dev/null 2>&1; then
  git checkout "$BRANCH_NAME"
else
  git checkout -b "$BRANCH_NAME"
fi

git add -A

COMMIT_MSG=$(cat <<'EOF'
feat: add admin controls, auth hardening, and branding updates

Main changes:
- fix container deploy env loading by passing both `.env` and `.env.local`
- add login audit tracking for IP, user agent, last login, and recent login events in admin account views
- add blocked sender domain controls so admin can ban multiple platforms and suppress inbox delivery from banned domains
- wire Cloudflare Turnstile into sign in and sign up with server-side verification and anti-bot refresh guidance
- harden Turnstile widget lifecycle to avoid repeated rerender loops and add widget reload fallback
- make admin account create card sticky and add A-Z / Z-A sorting to domain directory
- change guest random address prefixes to 7 lowercase letters and update guest/mobile inbox button sizing behavior
- rename breadcrumb root from `tmail` to `Email`
- replace brand assets with `ic_tmail.svg`, guest theme banners, auth desktop banner, and set site title/favicon to `Pusat Mail`
- add return-to-home button on auth pages and populate the desktop auth empty panel with the sign banner

Testing:
- [x] `pnpm typecheck`
- [ ] Verify admin account search shows last login IP and user agent correctly
- [ ] Verify blocked sender domains prevent banned platform emails from appearing in inbox
- [ ] Verify sign in / sign up Turnstile loads, can be reset, and blocks invalid bot verification
- [ ] Verify guest mobile navbar inbox button alignment and guest address generation format
- [ ] Verify guest and auth banners render correctly in light and dark modes
- [ ] Verify browser tab title and favicon show `Pusat Mail` branding
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
