import BG from "../../../assets/HomeBG.webp";

export default function HeroSection() {
  return (
    <div
      className="relative bg-cover bg-center py-8 sm:py-12 rounded-xl  shadow-lg hover:shadow-xl transition-shadow duration-300 md:mx-12 md:mt-12"
      style={{
        backgroundImage: `url(${BG})`,
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-blue-100 via-white to-blue-100 -z-10 rounded-xl opacity-70"></div>
      <div className="max-w-md text-center lg:mx-8 lg:flex-auto lg:py-32 lg:text-left">
        <h1 className="text-4xl font-bold tracking-tight text-black sm:text-5xl lg:text-black">
          Empowering Business Through Data-Driven Insights
        </h1>
        <p className="mt-6 sm:mx-4 text-lg leading-8 text-black sm:text-black lg:text-black">
          Our platform helps you streamline operations, make informed decisions,
          and grow your business with advanced analytics and insights. Optimize
          every aspect of your business with real-time data.
        </p>
      </div>
    </div>
  );
}
