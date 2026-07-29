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

BRANCH_NAME="feat/TMAIL-${TIMESTAMP}-admin-private-domain-access-fixes"

if git rev-parse --verify "$BRANCH_NAME" >/dev/null 2>&1; then
  git checkout "$BRANCH_NAME"
else
  git checkout -b "$BRANCH_NAME"
fi

git add -A

COMMIT_MSG=$(cat <<'EOF'
feat: fix admin-only private system domain access flow

Main changes:
- unify invalid guest email path handling so deployed `/{email}` routes no longer redirect silently and now follow the same validation flow as `?email=...`
- fix guest domain validation so inactive subdomains are checked against their exact domain status instead of inheriting a valid parent domain
- allow admin to set `system` domains as `private` from the admin domain editor and remove the old backend restriction that forced them back to `public`
- restrict `private system` domains so they are only visible and usable when an admin session is active
- hide `Open Backend Console` for guests and protect `/dashboard` server-side so only active admin sessions can access it
- update admin domain edit copy to explain `private system` behavior and keep `guest` domains blocked from becoming private
- remove unused oversized guest banner variant assets from the repo

Testing:
- [x] `pnpm typecheck`
- [ ] Verify invalid `/{email}` routes in production show the same unsupported flow as local `?email=...`
- [ ] Verify inactive subdomains like `aavc.cqpcut.pro` stay unsupported and do not inherit valid parent status
- [ ] Verify admin can switch `system` domains between `public` and `private` in the admin Domains editor
- [ ] Verify `private system` domains are only listed/usable while admin session is active
- [ ] Verify guests cannot open `Open Backend Console` or access `/dashboard` directly
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
