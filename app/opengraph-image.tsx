import {
  createSocialPreviewImage,
  socialPreviewAlt,
  socialPreviewSize,
} from "@/lib/social-preview-image"

export const alt = socialPreviewAlt
export const size = socialPreviewSize
export const contentType = "image/png"

export default function OpenGraphImage() {
  return createSocialPreviewImage()
}
