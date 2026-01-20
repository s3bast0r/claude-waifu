import { HomeHero } from "@/components/home-hero"
import { HowItWorks } from "@/components/how-it-works"
import { Footer } from "@/components/footer"

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <HomeHero />
      <HowItWorks />
      <Footer />
    </main>
  )
}
