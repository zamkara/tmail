import type { BackendDomainStatus } from "@/services/backend.service"

export function isSupportedBackendDomainStatus(
  status: BackendDomainStatus | null
) {
  return Boolean(status?.active && status.approved && status.mx_valid)
}
