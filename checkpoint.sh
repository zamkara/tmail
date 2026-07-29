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

BRANCH_NAME="feat/TMAIL-${TIMESTAMP}-backend-console-stats-and-domain-polish"

if git rev-parse --verify "$BRANCH_NAME" >/dev/null 2>&1; then
  git checkout "$BRANCH_NAME"
else
  git checkout -b "$BRANCH_NAME"
fi

git add -A

COMMIT_MSG=$(cat <<'EOF'
feat: expand backend console stats and polish domain handling

Main changes:
- add backend console platform totals for inbox messages, generated emails, active emails, registered domains, valid domains, private domains, incoming domains, valid MX domains, and users
- add frontend snapshot metrics in backend console for browser connectivity, language, timezone, viewport, device memory, and CPU core count
- normalize backend `/health` responses in the public proxy so admin health cards correctly interpret `{ api, redis, smtp }` as healthy instead of showing `Down`
- filter nested subdomains out of the admin domain directory so only stored root domains appear in the Domains menu and stats
- make admin address owner/domain dropdowns render with improved dark-mode colors
- keep domain status lookup exact-match only so searched domains do not inherit parent or child domain records
- update logged-in user random address generation to match guest format with 7 lowercase letters

Testing:
- [x] `pnpm typecheck`
- [ ] Verify Backend Console `Public Health` shows healthy when `/api/backend/public?path=/health` returns `{ "api":"ok","redis":"ok","smtp":"ok" }`
- [ ] Verify backend console totals and frontend snapshot cards render expected values
- [ ] Verify admin Domains menu excludes nested subdomains from the list and count
- [ ] Verify admin Addresses owner/domain dropdowns are readable in dark mode
- [ ] Verify logged-in generated email prefixes use 7 lowercase letters only
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
