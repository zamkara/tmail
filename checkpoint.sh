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

BRANCH_NAME="fix/TMAIL-${TIMESTAMP}-guest-store-hydration-first-load"

if git rev-parse --verify "$BRANCH_NAME" >/dev/null 2>&1; then
  git checkout "$BRANCH_NAME"
else
  git checkout -b "$BRANCH_NAME"
fi

git add -A

COMMIT_MSG=$(cat <<'EOF'
fix: stabilize guest first-load store hydration

Main changes:
- mark auth store hydration complete after persist rehydration so guest and user flows do not stall on fresh browsers
- mark address store hydration complete after persist rehydration so guest inbox auto-generation can proceed on first load and incognito sessions
- mark domain store hydration complete after persist rehydration by reapplying the current domain list into loaded state
- prevent the guest landing page from getting stuck in `No address` state when local storage starts empty in production

Testing:
- [x] `pnpm typecheck`
- [ ] Verify guest homepage in a new browser session auto-generates an address instead of showing `No address`
- [ ] Verify incognito guest homepage behaves the same after a hard refresh
- [ ] Verify existing logged-in and guest sessions still restore saved auth/address/domain state correctly
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
