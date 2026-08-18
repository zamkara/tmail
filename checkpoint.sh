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

BRANCH_NAME="feat/TMAIL-${TIMESTAMP}-address-flow-private-guard-and-social-preview"

if git rev-parse --verify "$BRANCH_NAME" >/dev/null 2>&1; then
  git checkout "$BRANCH_NAME"
else
  git checkout -b "$BRANCH_NAME"
fi

git add -A

COMMIT_MSG=$(cat <<'EOF'
feat: improve address flows, private inbox access, and social branding

Main changes:
- block guest inbox list and detail access for private domains on both the server and guest workspace so private messages and OTPs never flash before the access check finishes
- allow signed-in users to keep multiple active addresses on the same domain, stop replacing same-domain addresses on create, and route inbox pages by unique address id so duplicate-domain addresses stay clickable
- expand the logged-in `New` address flow so users can pick a domain first and then create either a random username or a manual username with preview and duplicate validation
- add admin bulk delete for selected domains in Domain Controls with a single confirmation and post-delete refresh
- add branded Open Graph and Twitter preview images from the Pusat Mail icon, replace the stale Vercel favicon fallback, and publish absolute production metadata for sharing previews

Testing:
- [x] `pnpm typecheck`
- [ ] Verify guest access to a private domain never shows inbox messages or OTP chips before the access error state
- [ ] Verify signed-in users can create multiple active addresses on the same domain and open each inbox independently
- [ ] Verify the `New` dialog supports both random and manual usernames and returns `already taken` for duplicate manual usernames
- [ ] Verify admin Domain Controls can bulk delete selected domains and related addresses
- [ ] Verify WhatsApp/Telegram/social previews use the Pusat Mail icon and generated preview image after cache busting
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
