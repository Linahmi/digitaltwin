import { ParticleScene } from '@/components/landing/ParticleScene'
import { HeroSection } from '@/components/landing/HeroSection'

export default function HomePage() {
  return (
    <main
      className="relative min-h-screen overflow-hidden"
      style={{
        background:
          'linear-gradient(135deg, #eef6fd 0%, #e4f3f5 45%, #d9f0ec 100%)',
      }}
    >
      <ParticleScene />
      <HeroSection />
    </main>
  )
}
