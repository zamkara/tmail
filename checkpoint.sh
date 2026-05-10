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

BRANCH_NAME="feat/TMAIL-${TIMESTAMP}-admin-voucher-domain-controls"

git checkout -b "$BRANCH_NAME"

git add -A

COMMIT_MSG="feat: admin console overhaul and voucher-based domain controls

Perubahan utama:
- app/api/admin/* + components/admin/admin-session-dialog.tsx: tambah admin console untuk overview, accounts, domains, addresses, vouchers, dan limits
- app/api/vouchers/redeem/route.ts + services/domain.service.ts: redeem voucher untuk buka private access domain milik user
- app/api/domains/route.ts + app/api/domains/[domainId]/route.ts + lib/domain-access.ts: ownership domain, visibility toggle, dan private access window
- components/sidebar/domain-section.tsx: domain milik akun di /inbox bisa buka dialog voucher dan toggle public/private selama voucher masih aktif
- components/address-sidebar.tsx + components/auth-loader.tsx: refresh domain/address state supaya sidebar inbox pakai data user yang benar
- components/ui/select.tsx + components/ui/table.tsx + components/ui/tabs.tsx: tambah komponen UI yang dipakai admin panel
- lib/admin-session.ts + lib/admin-settings.ts + lib/rate-limit.ts + lib/system-domains.ts: util admin/session/settings/rate limit/system domains
- models/admin-settings.model.ts + models/rate-limit.model.ts + models/voucher.model.ts: model baru untuk admin settings, rate limit, dan voucher
- types/index.ts + models/domain.model.ts: metadata domain untuk visibility/privateUntil/ownership
- app/api/auth/* + app/api/addresses/route.ts + app/api/app-settings/route.ts: penyesuaian auth dan API pendukung flow admin/inbox

Testing:
- [ ] Admin session bisa login dan buka semua tab
- [ ] Domain milik user di /inbox tampil dengan badge dan dialog voucher
- [ ] Redeem voucher mengubah domain ke private
- [ ] Selama privateUntil aktif, switch public/private bekerja dari dialog domain
- [ ] Ownership domain inbox.zamkara.uk terbaca benar untuk akun zamkara@gnuweeb.org
- [ ] Addresses tab admin lebih mudah discan dan edit address lewat dialog
"

git commit -m "$COMMIT_MSG"

echo ""
echo "Branch created: $BRANCH_NAME"
echo "Commit successful."
