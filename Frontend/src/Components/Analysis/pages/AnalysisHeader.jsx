import IMG1 from "../../../assets/VISIONARY.png";
function AnalysisHeader() {
  const handleScrollToSection = (e, item) => {
    e.preventDefault();
    const element = document.getElementById(item);
    const headerOffset = 70; // Adjust this based on your sticky header's height
    const elementPosition = element.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

    window.scrollTo({
      top: offsetPosition,
      behavior: "smooth",
    });
  };

  return (
    <>
      <nav className="bg-white shadow-lg mb-6 sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            {/* Logo/Brand Name */}
            <div className="text-2xl font-bold text-gray-800">
              <img src={IMG1} alt="" height={70} width={70} />
            </div>
            {/* Navigation Links */}
            <div className="hidden sm:flex space-x-6">
              {" "}
              <a
                href={`/owner/home`}
                className="px-4 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-200 hover:text-gray-900"
              >
                Home
              </a>
              {[
                "Turnover",
                "NetProfit",
                "ProductAnalysis",
                "SellingAnalysis",
                "StockAnalysis",
              ].map((item) => (
                <a
                  href={`#${item}`}
                  key={item}
                  className="px-4 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-200 hover:text-gray-900"
                  onClick={(e) => handleScrollToSection(e, item)}
                >
                  {item}
                </a>
              ))}
            </div>
            {/* Mobile Menu */}
            <div className="sm:hidden flex items-center">
              <button
                className="text-gray-600 hover:text-gray-800 focus:outline-none focus:text-gray-800"
                aria-label="Menu"
              >
                <svg
                  className="h-6 w-6"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}

export default AnalysisHeader;
