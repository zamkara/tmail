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

BRANCH_NAME="feat/TMAIL-${TIMESTAMP}-admin-address-bulk-actions-and-reuse"

if git rev-parse --verify "$BRANCH_NAME" >/dev/null 2>&1; then
  git checkout "$BRANCH_NAME"
else
  git checkout -b "$BRANCH_NAME"
fi

git add -A

COMMIT_MSG=$(cat <<'EOF'
feat: improve admin address actions and duplicate reuse flow

Main changes:
- let users reuse their own existing address instead of creating a duplicate row when global address uniqueness is disabled and the same manual address is requested again
- return the refreshed active address list after reuse so the user address sidebar stays deduplicated without adding another address entry
- add select-all and per-item checkbox controls to `Admin > Addresses` with a bulk `Delete Selected` action matching the Domains workflow
- keep per-address edit and delete buttons isolated from row selection so address management stays predictable during bulk operations

Testing:
- [x] `pnpm typecheck`
- [ ] Verify requesting the same manual address twice with uniqueness `OFF` reuses the existing user address and does not add another address row
- [ ] Verify requesting the same manual address with uniqueness `ON` still returns `Email address is already taken`
- [ ] Verify `Admin > Addresses` supports single-select, select-all, and bulk delete with the expected confirmation flow
- [ ] Verify address edit and delete buttons still work without toggling unexpected selections
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
