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

BRANCH_NAME="feat/TMAIL-${TIMESTAMP}-admin-address-uniqueness-toggle"

if git rev-parse --verify "$BRANCH_NAME" >/dev/null 2>&1; then
  git checkout "$BRANCH_NAME"
else
  git checkout -b "$BRANCH_NAME"
fi

git add -A

COMMIT_MSG=$(cat <<'EOF'
feat: add admin control for address uniqueness rules

Main changes:
- add an admin settings flag to enforce or disable global address uniqueness from the Backend Console limits module
- move duplicate-address enforcement out of the old global Mongo `address` unique index and into backend validation that can respect the admin toggle
- allow the same email address to be reused across different users only when global uniqueness is disabled and the address belongs to a private user-owned domain
- update user and admin address create/update routes to use the new ownership-aware conflict checks before saving addresses
- migrate address indexing toward a scoped unique key on `address + userId` so one account can reuse its own addresses safely without cross-user collisions

Testing:
- [x] `pnpm typecheck`
- [ ] Verify `Enforce global address uniqueness` appears in admin Limits and persists after save
- [ ] Verify duplicate addresses are blocked globally when the setting is enabled
- [ ] Verify duplicate addresses can be reused by different users on owned private domains when the setting is disabled
- [ ] Verify user and admin address update flows still reject invalid domain/address combinations
- [ ] Verify Mongo can drop the old global `address_1` index and create the scoped `address_1_userId_1` index during runtime
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
