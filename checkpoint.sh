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

BRANCH_NAME="feat/TMAIL-${TIMESTAMP}-terms-and-legal-policies"

if git rev-parse --verify "$BRANCH_NAME" >/dev/null 2>&1; then
  git checkout "$BRANCH_NAME"
else
  git checkout -b "$BRANCH_NAME"
fi

git add -A

COMMIT_MSG=$(cat <<'EOF'
feat: add terms and legal policies page

Main changes:
- add a responsive `/terms-and-conditions` page using the existing Pusat Mail theme, typography, cards, buttons, and light/dark mode styling
- publish the complete Terms of Service, Privacy Policy, and Abuse Policy with section navigation and last-updated information
- add Pusat Mail branding, a return-to-home action, and a theme toggle to the legal page header
- add a two-line global footer with bold direct links to the Terms, Privacy, and Abuse policy sections

Testing:
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [ ] Verify the bold Terms, Privacy, and Abuse footer links open their matching policy sections
- [ ] Verify all legal sections and anchor navigation on desktop and mobile
- [ ] Verify the legal page in both light and dark themes
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
