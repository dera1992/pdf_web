import { FAQ } from '../components/landing/FAQ'
import { Features } from '../components/landing/Features'
import { Footer } from '../components/landing/Footer'
import { Hero } from '../components/landing/Hero'
import { HowItWorks } from '../components/landing/HowItWorks'
import { Navbar } from '../components/landing/Navbar'
import { Pricing } from '../components/landing/Pricing'
import { SupportedFormats } from '../components/landing/SupportedFormats'
import { Testimonials } from '../components/landing/Testimonials'
import { ToolDirectory } from '../components/landing/ToolDirectory'
import { Trust } from '../components/landing/Trust'

export const LandingPage = () => (
  <div className="bg-white text-surface-900 dark:bg-surface-900 dark:text-surface-50">
    <Navbar />
    <main>
      <Hero />
      <ToolDirectory />
      <Features />
      <HowItWorks />
      <Trust />
      <SupportedFormats />
      <Testimonials />
      <Pricing />
      <FAQ />
    </main>
    <Footer />
  </div>
)
