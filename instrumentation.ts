export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { seedSystemDomains } = await import("./lib/seed")
    await seedSystemDomains()
  }
}
