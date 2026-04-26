import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import HeroSection from "@/features/home/components/HeroSection";
import CallToAction from "@/features/home/components/CallToAction";
import FeaturesSection from "@/features/home/components/FeaturesSection";
import HowItWorks from "@/features/home/components/HowItWorks";
import InfoPromoSection from "@/features/home/components/InfoPromoSection";
import PlansSection from "@/features/subscription/components/PlansSection";

export default function Home() {
    return (
        <div className="home-page overflow-x-hidden bg-transparent">
            {/* Navbar */}
            <Header />

            {/* Hero Section */}
            <HeroSection />

            {/* Features Section */}
            <FeaturesSection />

            {/* How It Works Section */}
            <HowItWorks />

            {/* Info Promo Section */}
            <InfoPromoSection />

            {/* Plans Section */}
            <PlansSection
                compact
                title="Our Plans"
                subtitle="Simple, transparent pricing built for growing teams."
            />

            {/* Call-to-Action Section */}
            <CallToAction
                title="Ready to Transform Your Business?"
                description="Join businesses who are already using Visionary to streamline their operations."
            />

            {/* Footer */}
            <Footer />
        </div>
    );
}
