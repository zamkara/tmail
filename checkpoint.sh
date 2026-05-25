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

BRANCH_NAME="feat/TMAIL-${TIMESTAMP}-user-inbox-address-domain-controls"

if git rev-parse --verify "$BRANCH_NAME" >/dev/null 2>&1; then
  git checkout "$BRANCH_NAME"
else
  git checkout -b "$BRANCH_NAME"
fi

git add -A

COMMIT_MSG=$(cat <<'EOF'
feat: improve user inbox, address generation, and domain controls

Main changes:
- align user inbox realtime behavior with guest inbox using websocket events and slower fallback polling
- add delete-all message confirmation dialogs for desktop, mobile, and guest inbox flows
- add OTP detection/copy action to user inbox message lists
- add active-email breadcrumb copy support and message-id breadcrumb detail
- add active address custom edit, delete, domain validity status, and same-domain generation actions
- add manual domain picker and random-domain address generation from the active-address sidebar
- add wildcard/subdomain address generation support for user-owned domains
- add private-domain guest blocking so private domains cannot be opened from public guest flow
- allow deleting user-owned domains and cleanup related active addresses
- improve guest custom-email validation so invalid/private domains do not replace the current inbox

Testing:
- [x] `pnpm typecheck`
- [ ] User inbox websocket update and fallback polling
- [ ] Delete all messages on desktop, mobile, and guest inbox
- [ ] OTP copy button on user inbox list
- [ ] Active address create, random create, edit, delete, and same-domain generate
- [ ] User domain private/public toggle, wildcard generate, and delete
- [ ] Guest private-domain access rejection
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
