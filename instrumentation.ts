export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { seedSystemDomains } = await import("./lib/seed")
    try {
      await seedSystemDomains()
    } catch (error) {
      console.warn("Gagal seed domain sistem saat startup:", error)
    }
  }
}
