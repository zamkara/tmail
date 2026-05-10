"use client"

import { useEffect, useRef } from "react"

import { cn } from "@/lib/utils"

interface Star {
  angle: number
  radius: number
  speed: number
  size: number
}

interface ShootingStar {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  initialLife: number
}

interface ShootingStarsProps {
  className?: string
  starCount?: number
}

function getStarColor() {
  const isDark = document.documentElement.classList.contains("dark")

  return isDark
    ? { r: 255, g: 255, b: 255, baseAlpha: 0.65 }
    : { r: 73, g: 69, b: 79, baseAlpha: 0.35 }
}

export default function ShootingStars({
  className,
  starCount = 360,
}: ShootingStarsProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return

    let stars: Star[] = []
    let shootingStars: ShootingStar[] = []
    let animationId = 0
    let width = 0
    let height = 0
    let pixelRatio = 1
    let color = getStarColor()

    const initStars = () => {
      const maxRadius = Math.sqrt(width ** 2 + height ** 2)

      stars = Array.from({ length: starCount }, () => ({
        angle: Math.random() * Math.PI * 2,
        radius: Math.random() * maxRadius,
        speed: Math.random() * 0.0003 + 0.00015,
        size: Math.random() * 1.2 + 0.5,
      }))
    }

    const resizeCanvas = () => {
      pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
      width = window.innerWidth
      height = window.innerHeight

      canvas.width = Math.max(1, Math.floor(width * pixelRatio))
      canvas.height = Math.max(1, Math.floor(height * pixelRatio))
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)

      initStars()
    }

    const spawnShootingStar = () => {
      if (shootingStars.length > 0 || Math.random() >= 0.01) return

      shootingStars.push({
        x: Math.random() * width * 0.5,
        y: Math.random() * height * 0.5,
        vx: 3 + Math.random() * 2,
        vy: 1 + Math.random() * 1.5,
        life: 80,
        initialLife: 80,
      })
    }

    const draw = (timestamp: number) => {
      const centerX = width
      const centerY = height

      ctx.clearRect(0, 0, width, height)

      stars.forEach((star, index) => {
        star.angle += star.speed
        const x = centerX + star.radius * Math.cos(star.angle)
        const y = centerY + star.radius * Math.sin(star.angle)
        const flicker =
          (0.4 + Math.abs(Math.sin(timestamp * 0.0015 + index)) * 0.5) *
          color.baseAlpha

        ctx.beginPath()
        ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${flicker})`
        ctx.arc(x, y, star.size, 0, Math.PI * 2)
        ctx.fill()
      })

      spawnShootingStar()

      for (let index = shootingStars.length - 1; index >= 0; index--) {
        const shootingStar = shootingStars[index]
        const opacity = shootingStar.life / shootingStar.initialLife
        const gradient = ctx.createLinearGradient(
          shootingStar.x,
          shootingStar.y,
          shootingStar.x - shootingStar.vx * 35,
          shootingStar.y - shootingStar.vy * 35
        )

        gradient.addColorStop(
          0,
          `rgba(${color.r}, ${color.g}, ${color.b}, ${opacity * color.baseAlpha})`
        )
        gradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`)

        ctx.strokeStyle = gradient
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(shootingStar.x, shootingStar.y)
        ctx.lineTo(
          shootingStar.x - shootingStar.vx * 18,
          shootingStar.y - shootingStar.vy * 18
        )
        ctx.stroke()

        shootingStar.x += shootingStar.vx
        shootingStar.y += shootingStar.vy
        shootingStar.life -= 1

        if (shootingStar.life <= 0) {
          shootingStars.splice(index, 1)
        }
      }

      animationId = requestAnimationFrame(draw)
    }

    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)
    const observer = new MutationObserver(() => {
      color = getStarColor()
    })
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    })
    animationId = requestAnimationFrame(draw)

    return () => {
      window.removeEventListener("resize", resizeCanvas)
      observer.disconnect()
      cancelAnimationFrame(animationId)
    }
  }, [starCount])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={cn(
        "fixed inset-0 z-0 size-full pointer-events-none",
        className
      )}
    />
  )
}
