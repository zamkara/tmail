import DesktopOnly from "@/components/shared/desktop-only"
import { LoginForm } from "@/components/login-form"
import PixelBlast from "@/components/shared/pixel-blast"

export default function SignInPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-background p-6 md:p-10">
      <DesktopOnly>
        <PixelBlast
          className="pointer-events-none translate-x-28 translate-y-12 scale-110 opacity-0 transition-all delay-500 duration-1000 ease-in-out group-hover:opacity-100 dark:group-hover:opacity-50"
          variant="circle"
          pixelSize={4}
          color="#a855f7"
          patternScale={3}
          patternDensity={1.2}
          pixelSizeJitter={4}
          enableRipples
          rippleSpeed={0.4}
          rippleThickness={10}
          rippleIntensityScale={1.5}
          liquid
          liquidStrength={0.12}
          liquidRadius={1.2}
          liquidWobbleSpeed={5}
          speed={0.6}
          edgeFade={0}
          transparent
        />
      </DesktopOnly>
      <div className="w-full max-w-sm md:max-w-4xl">
        <LoginForm mode="signin" />
      </div>
    </div>
  )
}
