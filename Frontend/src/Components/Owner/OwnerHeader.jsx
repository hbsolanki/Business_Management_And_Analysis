import IMG1 from "../../assets/VISIONARY.png";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import GeneralModal from "../Utils/GeneralModal";

function OwnerHeader({ Businessid }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false); // State to control modal visibility
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      localStorage.clear();
      navigate("/");
    } catch (error) {
      alert("Error logging out:", error.message || error);
    }
  };

  return (
    <>
      <nav className="bg-white shadow-lg mb-2 sticky top-0 z-50 rounded-lg items-center">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            {/* Logo/Brand Name */}
            <div className="text-2xl font-bold text-gray-800">
              <img src={IMG1} alt="Logo" height={70} width={70} />
            </div>
            {/* Navigation Links for Desktop */}
            <div className="hidden sm:flex space-x-6">
              <Link
                to={"/"}
                className="px-4 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-200 hover:text-gray-900"
              >
                Home
              </Link>
              {Businessid ? (
                <Link
                  to={`/analysis/${Businessid}`}
                  className="px-4 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-200 hover:text-gray-900"
                >
                  Analysis
                </Link>
              ) : (
                <Link
                  to={`/owner/business/new`}
                  className="px-4 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-200 hover:text-gray-900"
                >
                  Create Business
                </Link>
              )}
              <button
                onClick={() => setIsModalOpen(true)} // Open the modal on logout click
                className="px-4 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-200 hover:text-gray-900"
              >
                Logout
              </button>
            </div>

            {/* Mobile Menu Button */}
            <div className="sm:hidden flex items-center">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
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

          {/* Mobile Menu */}
          {isMobileMenuOpen && (
            <div className="sm:hidden bg-gray-50 rounded-md shadow-lg">
              <Link
                to={"/"}
                className="block px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 hover:text-gray-900"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Home
              </Link>
              {Businessid ? (
                <Link
                  to={`/analysis/${Businessid}`}
                  className="block px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 hover:text-gray-900"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Analysis
                </Link>
              ) : (
                <Link
                  to={`/owner/business/new`}
                  className="block px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 hover:text-gray-900"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Create Business
                </Link>
              )}
              <button
                onClick={() => {
                  setIsModalOpen(true); // Open modal on logout
                  setIsMobileMenuOpen(false);
                }}
                className="block w-full text-left px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 hover:text-gray-900"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </nav>
      {/* General Modal for Logout Confirmation*/}
      <GeneralModal
        open={isModalOpen}
        setOpen={setIsModalOpen}
        title="Logout"
        message="Are you sure you want to Logout? This action cannot be undone."
        onConfirm={handleLogout}
        confirmText="Logout"
        cancelText="Cancel"
      />
    </>
  );
}

export default OwnerHeader;
