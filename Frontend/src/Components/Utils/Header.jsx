import IMG1 from "../../assets/VISIONARY.png";
import { useState } from "react";
import { Link } from "react-router-dom";
import { FaUserPlus, FaSignInAlt, FaUsers, FaBars } from "react-icons/fa"; // Importing icons from react-icons

function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const toggleMenu = () => setIsOpen(!isOpen);

  return (
    <nav className="bg-white shadow-lg mb-6 sticky top-0 z-50 md:mx-12 md:mt-4 rounded-xl">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <Link to={"/"} className="text-2xl font-bold text-gray-800">
            <img src={IMG1} alt="Logo" height={70} width={70} />
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex space-x-6">
            <a
              href="/owner/registration"
              className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-200 hover:text-gray-900"
            >
              <FaUserPlus size={18} /> Owner Registration
            </a>
            <a
              href="/owner/login"
              className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-200 hover:text-gray-900"
            >
              <FaSignInAlt size={18} /> Owner Login
            </a>
            <a
              href="/employee/login"
              className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-200 hover:text-gray-900"
            >
              <FaUsers size={18} /> Employee Login
            </a>
          </div>

          {/* Mobile Menu Button */}
          <div className="sm:hidden flex items-center">
            <button
              onClick={toggleMenu}
              className="text-gray-600 hover:text-gray-800 focus:outline-none"
              aria-label="Menu"
            >
              <FaBars size={24} />
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {isOpen && (
          <div className="sm:hidden bg-white shadow-md mt-2 rounded-md">
            <a
              href="/owner/registration"
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
            >
              <FaUserPlus size={18} /> Owner Registration
            </a>
            <a
              href="/owner/login"
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
            >
              <FaSignInAlt size={18} /> Owner Login
            </a>
            <a
              href="/employee/login"
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
            >
              <FaUsers size={18} /> Employee Login
            </a>
          </div>
        )}
      </div>
    </nav>
  );
}

export default Header;
