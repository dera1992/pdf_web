import { Footer } from '../components/landing/Footer'
import { Navbar } from '../components/landing/Navbar'
import { Pricing } from '../components/landing/Pricing'

export const PricingPage = () => (
  <div className="bg-white text-surface-900 dark:bg-surface-900 dark:text-surface-50">
    <Navbar />
    <main>
      <Pricing />
    </main>
    <Footer />
  </div>
)
