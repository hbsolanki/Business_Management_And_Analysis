import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import HeroSection from "@/features/home/components/HeroSection";
import CallToAction from "@/features/home/components/CallToAction";
import FeaturesSection from "@/features/home/components/FeaturesSection";
import HowItWorks from "@/features/home/components/HowItWorks";

export default function Home() {
    return (
        <div className="home-page overflow-x-hidden bg-gray-50/50">
            {/* Navbar */}
            <Header />

            {/* Hero Section */}
            <HeroSection />

            {/* Features Section */}
            <FeaturesSection />

            {/* How It Works Section */}
            <HowItWorks />

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
