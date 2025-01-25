import { useState } from "react";
import IMG1 from "../../../assets/VISIONARY.png";
import { Link, useNavigate } from "react-router-dom";
import GeneralModal from "../../Utils/GeneralModal";

function EmployeeHeader({ employeeData }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false); // State for modal visibility
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      // Clear token from localStorage (or sessionStorage)
      localStorage.clear();

      // Redirect to login or home page
      navigate("/");
    } catch (error) {
      alert("Error logging out:", error);
    }
  };

  return (
    <>
      {/* General Modal for Logout Confirmation */}
      <GeneralModal
        open={isModalOpen} // Modal visibility controlled by this state
        setOpen={setIsModalOpen} // Function to close the modal
        title="Logout"
        message="Are you sure you want to Logout? This action cannot be undone."
        onConfirm={() => {
          handleLogout();
          setIsModalOpen(false); // Close the modal after logout
        }}
        confirmText="Logout"
        cancelText="Cancel"
      />

      <nav className="bg-white shadow-lg mb-6 sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            {/* Logo/Brand Name */}
            <div className="text-2xl font-bold text-gray-800">
              <img src={IMG1} alt="Visionary Logo" height={70} width={70} />
            </div>

            {/* Navigation Links for Desktop */}
            <div className="hidden sm:flex space-x-6">
              <Link
                to="/"
                className="px-4 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-200 hover:text-gray-900"
              >
                Home
              </Link>
              {employeeData?.workpage && (
                <Link
                  to={employeeData.workpage}
                  className="px-4 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-200 hover:text-gray-900"
                >
                  Workpage
                </Link>
              )}
              <Link
                to={`/employee/${employeeData["_id"]}/edit`}
                className="px-4 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-200 hover:text-gray-900"
              >
                Edit Profile
              </Link>
              <button
                onClick={() => setIsModalOpen(true)} // Show the modal on logout click
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
                to="/"
                className="block px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 hover:text-gray-900"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Home
              </Link>
              {employeeData?.workpage && (
                <Link
                  to={employeeData.workpage}
                  className="block px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 hover:text-gray-900"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Workpage
                </Link>
              )}
              <Link
                to={`/employee/${employeeData["_id"]}/edit`}
                className="block px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 hover:text-gray-900"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Edit Profile
              </Link>
              <button
                onClick={() => {
                  setIsModalOpen(true); // Show the modal on logout click
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
    </>
  );
}

export default EmployeeHeader;
