"use client"

import { useState } from "react"
import { SparklesIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { generateAddress } from "@/services/address.service"
import { useAddressStore } from "@/stores/address.store"

interface GenerateAddressButtonProps {
  domainId: string
  domainName: string
}

export default function GenerateAddressButton({
  domainId,
  domainName,
}: GenerateAddressButtonProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const addresses = useAddressStore((state) => state.addresses)
  const addAddress = useAddressStore((state) => state.addAddress)
  const setActiveAddress = useAddressStore((state) => state.setActiveAddress)

  async function handleGenerate() {
    const existingAddress = addresses.find(
      (address) =>
        address.domainId === domainId &&
        new Date(address.expiresAt) > new Date()
    )

    if (existingAddress) {
      setActiveAddress(existingAddress.id)
      router.push(`/inbox/${existingAddress.id}`)
      return
    }

    setIsLoading(true)

    try {
      const address = await generateAddress(domainId, domainName)
      addAddress(address)
      setActiveAddress(address.id)
      toast.success("Alamat email dibuat")
      router.push(`/inbox/${address.id}`)
    } catch {
      toast.error("Gagal membuat alamat email")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      aria-label={`Buat alamat dari ${domainName}`}
      disabled={isLoading}
      onClick={() => void handleGenerate()}
    >
      {isLoading ? <Spinner /> : <SparklesIcon />}
    </Button>
  )
}
