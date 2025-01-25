import IMG1 from "../../assets/VISIONARY.png";
import { useState } from "react";
import { Link } from "react-router-dom";

function Header() {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      <nav className="bg-white shadow-lg mb-6 sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            {/* Logo/Brand Name */}
            <Link to={"/"} className="text-2xl font-bold text-gray-800">
              <img src={IMG1} alt="Logo" height={70} width={70} />
            </Link>
            {/* Navigation Links */}
            <div className="hidden sm:flex space-x-6">
              <div className="hidden md:flex space-x-6">
                <a
                  href="/owner/registration"
                  className="px-4 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-200 hover:text-gray-900"
                >
                  Owner Registration
                </a>
                <a
                  href="/owner/login"
                  className="px-4 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-200 hover:text-gray-900"
                >
                  Owner Login
                </a>
                <a
                  href="/employee/login/page"
                  className="px-4 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-200 hover:text-gray-900"
                >
                  Employee Login
                </a>
              </div>
            </div>
            {/* Mobile Menu */}
            <div className="sm:hidden flex items-center">
              <button
                onClick={toggleMenu}
                className="text-gray-600 hover:text-gray-800 focus:outline-none"
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
          {/* Mobile Dropdown Menu */}
          {isOpen && (
            <div className="sm:hidden bg-white shadow-md mt-2 rounded-md">
              <a
                href="/owner/registration"
                className="block px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
              >
                Owner Registration
              </a>
              <a
                href="/owner/login"
                className="block px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
              >
                Owner Login
              </a>
              <a
                href="/employee/login/page"
                className="block px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
              >
                Employee Login
              </a>
            </div>
          )}
        </div>
      </nav>
    </>
  );
}

export default Header;
