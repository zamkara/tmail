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

BRANCH_NAME="feat/TMAIL-${TIMESTAMP}-admin-api-keys-and-guest-email-context"

if git rev-parse --verify "$BRANCH_NAME" >/dev/null 2>&1; then
  git checkout "$BRANCH_NAME"
else
  git checkout -b "$BRANCH_NAME"
fi

git add -A

COMMIT_MSG=$(cat <<'EOF'
feat: add admin api keys and guest email context flow

Main changes:
- add admin-managed API keys stored in MongoDB with create, edit, delete, active toggle, whitelist, blacklist, and usage metadata
- allow admin API key authentication across protected admin routes by extending server-side admin session checks to accept request-based API key access
- add guest email context persistence so direct email routes sync through cookies and the homepage keeps the selected guest address after refresh
- filter nested subdomains out of public and admin domain lists while keeping exact domain status checks for manual subdomain validation
- update backend console Docs action to open the external API docs site at `https://api.pusat.email/`
- add the API docs link to the user API key settings panel for faster access to integration references

Testing:
- [x] `pnpm typecheck`
- [ ] Verify admin can create, edit, disable, and delete API keys from the Admin Session dialog
- [ ] Verify admin API keys can access protected admin API routes with whitelist and blacklist rules applied
- [ ] Verify guest email opened from `/{email}` persists after refresh and redirects back to `/` with the same inbox context
- [ ] Verify public and admin domain lists exclude nested subdomains while manual subdomain status checks still validate exact domains
- [ ] Verify backend console `Docs` and user API key settings docs link both open `https://api.pusat.email/`
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
