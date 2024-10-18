import Footer from "./Footer";
import Header from "./Header";
import BG from "../../assets/HomeBG.webp";

export default function Home() {
  return (
    <div className="home-page">
      {/* Navbar */}
      <Header />

      {/* Hero Section */}
      <div
        className="relative hero-section bg-cover bg-center h-screen text-white flex"
        style={{
          backgroundImage: `url(${BG})`,
        }}
      >
        <div className="absolute top-0 left-0 w-full h-full bg-black bg-opacity-50"></div>

        <div className="relative z-10 text-center mx-auto max-w-2xl py-32 sm:py-48 lg:py-56">
          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight leading-tight">
            Empowering Business Through Data-Driven Insights
          </h1>
          <p className="mt-6 text-lg leading-8 text-gray-300">
            Our platform helps you streamline operations, make informed
            decisions, and grow your business with advanced analytics and
            insights. Optimize every aspect of your business with real-time
            data.
          </p>
        </div>
      </div>

      {/* Call-to-Action Section */}
      <section className="bg-white py-20">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold text-gray-800">
            Why Choose BizVisionary?
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            We provide real-time insights that help your business thrive.
            Whether you're looking to streamline operations or boost
            productivity, our platform is designed to meet your needs.
          </p>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}
