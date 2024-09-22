import IMG1 from "../../assets/VISIONARY.png";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

function OwnerHeader({ ownerData }) {
  const navigate = useNavigate();
  const handleLogout = async () => {
    try {
      // Optionally call your FastAPI logout endpoint
      // await axios.post("/API/logout", null, {
      //   headers: {
      //     Authorization: `Bearer ${localStorage.getItem("access_token")}`,
      //   },
      // });

      // Clear token from localStorage (or sessionStorage)
      localStorage.removeItem("access_token");
      localStorage.removeItem("user_data");
      localStorage.removeItem("token");
      // Redirect to login or home page
      navigate("/");
    } catch (error) {
      alert("Error logging out:", error);
    }
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
              <Link
                href={`/owner/home`}
                className="px-4 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-200 hover:text-gray-900"
              >
                Home
              </Link>
              {ownerData.businessid ? (
                <Link
                  to={`/analysis/${ownerData.businessid}`}
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
                onClick={handleLogout}
                className="px-4 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-200 hover:text-gray-900"
              >
                Logout
              </button>
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

export default OwnerHeader;
