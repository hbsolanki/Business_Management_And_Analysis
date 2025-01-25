import IMG from "../../../assets/Home/productivity.png";

export default function CTA_Sections() {
  return (
    <div className="bg-gradient-to-r from-blue-50 via-white to-blue-50">
      <div className="mx-auto max-w-7xl py-24 px-6 sm:py-32 lg:px-8">
        <div className="relative isolate overflow-hidden bg-white px-6 pt-16 shadow-lg sm:rounded-3xl sm:px-16 md:pt-24 lg:flex lg:gap-x-20 lg:px-24 lg:pt-0">
          {/* Background Gradient */}
          <svg
            viewBox="0 0 1024 1024"
            aria-hidden="true"
            className="absolute left-1/2 top-1/2 -z-10 h-[64rem] w-[64rem] -translate-y-1/2 [mask-image:radial-gradient(closest-side,white,transparent)] sm:left-full sm:-ml-80 lg:left-1/2 lg:ml-0 lg:-translate-x-1/2 lg:translate-y-0"
          >
            <circle
              r={512}
              cx={512}
              cy={512}
              fill="url(#light-gradient)"
              fillOpacity="0.6"
            />
            <defs>
              <radialGradient id="light-gradient">
                <stop stopColor="#E3F2FD" />
                <stop offset={1} stopColor="#BBDEFB" />
              </radialGradient>
            </defs>
          </svg>

          {/* Content Section */}
          <div className="mx-auto max-w-md text-center lg:mx-0 lg:flex-auto lg:py-32 lg:text-left">
            <h2 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
              Boost your productivity. <br />
              Start using our app today.
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-gray-600">
              Transform your business operations with our advanced tools. Manage
              tasks, streamline workflows, and achieve your goals with ease.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row lg:justify-start">
              <a
                href="/owner/registration"
                className="rounded-md bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Get Started
              </a>
              <a
                href="/"
                className="text-sm font-semibold text-blue-600 hover:text-blue-800"
              >
                Learn More <span aria-hidden="true">→</span>
              </a>
            </div>
          </div>

          {/* Image Section */}
          <div className="relative mt-16 lg:mt-8 lg:w-1/2">
            <img
              alt="App dashboard preview"
              src={IMG}
              width={1824}
              height={880}
              className="w-full rounded-lg shadow-md ring-1 ring-gray-200"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
