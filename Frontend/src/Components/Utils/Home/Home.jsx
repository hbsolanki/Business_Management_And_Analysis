import Footer from "../Footer";
import Header from "../Header";
import HeroSection from "./HeroSection";
import CallToAction from "./CallToAction";
import FeaturesSection from "./FeaturesSection";
import CTA_Sections from "./CTA_Sections";

export default function Home() {
  return (
    <div className="home-page overflow-x-hidden bg-gray-100">
      {/* Navbar */}
      <Header />

      {/* Hero Section */}
      <HeroSection />

      {/* Call-to-Action Section */}
      <CallToAction
        title="Why Choose BizVisionary?"
        description="We provide real-time insights that help your business thrive. Whether you're looking to streamline operations or boost productivity, our platform is designed to meet your needs."
      />

      {/* Features Section */}
      <FeaturesSection />

      {/* Additional Call-to-Action Sections */}
      <CTA_Sections />

      {/* Footer */}
      <Footer />
    </div>
  );
}
