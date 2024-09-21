import Footer from "./Footer";

export default function Home() {
  return (
    <>
      <div className="bg-white">
        <div className="relative isolate px-6 pt-14 lg:px-8">
          <div
            className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80"
            aria-hidden="true"
          >
            <div
              className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-indigo-500 to-orange-500 opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
              style={{
                clipPath:
                  "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
              }}
            />
          </div>

          <div className="mx-auto max-w-2xl py-32 sm:py-48 lg:py-56">
            <div className="text-center">
              <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
                Empowering Business Through Data-Driven Insights
              </h1>
              <p className="mt-6 text-lg leading-8 text-gray-600">
                Our platform helps you streamline operations, make informed
                decisions, and grow your business with advanced analytics and
                insights. Optimize every aspect of your business with real-time
                data.
              </p>
              <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                {/* Button for Owner Registration */}
                <a
                  href="/owner/registration"
                  className="rounded-md bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                >
                  Owner Registration
                </a>

                {/* Button for Owner Login */}
                <a
                  href="/owner/login"
                  className="rounded-md bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                >
                  Owner Login
                </a>

                {/* Button for Employee Login */}
                <a
                  href="/employee/login/page"
                  className="rounded-md bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                >
                  Employee Login
                </a>

                {/* Button for Learning More */}
                <a
                  href="/learn"
                  className="text-sm font-semibold leading-6 text-gray-900"
                >
                  Learn more <span aria-hidden="true">→</span>
                </a>
              </div>
            </div>
          </div>

          {/* Bottom background design */}
          <div
            className="absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-30rem)]"
            aria-hidden="true"
          >
            <div
              className="relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 bg-gradient-to-tr from-indigo-500 to-orange-500 opacity-30 sm:left-[calc(50%+36rem)] sm:w-[72.1875rem]"
              style={{
                clipPath:
                  "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
              }}
            />
          </div>
        </div>

        {/* Feature Section */}
        <div className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-base font-semibold tracking-wide text-indigo-600 uppercase">
                Business Insights
              </h2>
              <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
                Stay Ahead with Real-Time Analytics
              </p>
              <p className="mt-4 max-w-2xl text-xl text-gray-500 lg:mx-auto">
                Our platform provides intuitive dashboards to visualize key
                business metrics like revenue, inventory levels, employee
                performance, and more.
              </p>
            </div>
          </div>

          {/* Insight Cards */}
          <div className="mt-10">
            <div className="flex justify-center space-x-10">
              <div className="bg-white shadow-lg rounded-lg p-6 w-72">
                <h3 className="text-lg font-medium text-gray-900">
                  Revenue Dashboard
                </h3>
                <p className="mt-2 text-sm text-gray-600">
                  Track your revenue streams, expenses, and profitability all in
                  one place.
                </p>
                <img
                  className="mt-4"
                  src="/images/revenue-dashboard.png"
                  alt="Revenue Dashboard"
                />
              </div>

              <div className="bg-white shadow-lg rounded-lg p-6 w-72">
                <h3 className="text-lg font-medium text-gray-900">
                  Employee Productivity
                </h3>
                <p className="mt-2 text-sm text-gray-600">
                  Measure the efficiency and output of your workforce using
                  detailed reports.
                </p>
                <img
                  className="mt-4"
                  src="/images/employee-productivity.png"
                  alt="Employee Productivity"
                />
              </div>

              <div className="bg-white shadow-lg rounded-lg p-6 w-72">
                <h3 className="text-lg font-medium text-gray-900">
                  Inventory Insights
                </h3>
                <p className="mt-2 text-sm text-gray-600">
                  Monitor your stock levels, sales trends, and product
                  performance effortlessly.
                </p>
                <img
                  className="mt-4"
                  src="/images/inventory-insights.png"
                  alt="Inventory Insights"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}
