import { ParticleBackground } from '@/components/landing/ParticleBackground'
import { HeroSection } from '@/components/landing/HeroSection'

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0a0a0a]">
      <ParticleBackground />
      <HeroSection />
    </main>
  )
}
