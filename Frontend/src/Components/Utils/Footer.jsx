const currentYear = new Date().getFullYear();
import "@fortawesome/fontawesome-free/css/all.min.css";

function Footer() {
  return (
    <>
      {/* Footer Section with White Background and Shadow */}
      <section className="bg-white shadow-lg mb-6 md:mx-12 md:mt-4 rounded-xl">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 py-8">
            {/* Column 1: About */}
            <div>
              <h3 className="text-2xl font-semibold text-blue-600 mb-4">
                About BizVisionary
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                BizVisionary helps businesses optimize their processes with
                smart analytics and data-driven solutions. Our goal is to
                empower organizations with the tools they need for success in
                today’s competitive market.
              </p>
            </div>

            {/* Column 2: Contact */}
            <div>
              <h3 className="text-2xl font-semibold text-blue-600 mb-4">
                Contact Us
              </h3>
              <div className="text-sm text-gray-600 space-y-2">
                <p>Ahmedabad, India</p>
                <p>Phone: +91 81600 62665</p>
                <p>Email: ethics.vision.connect@gmail.com</p>
              </div>
            </div>

            {/* Column 3: Social Media */}
            <div>
              <h3 className="text-2xl font-semibold text-blue-600 mb-4">
                Follow Us
              </h3>
              <ul className="flex justify-center md:justify-start space-x-6 mt-4">
                <li>
                  <a
                    href="https://www.facebook.com/bizvisionary011"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 flex items-center justify-center bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
                  >
                    <i className="fab fa-facebook-f"></i>
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.linkedin.com/in/bizvisionary011/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 flex items-center justify-center bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
                  >
                    <i className="fab fa-linkedin-in"></i>
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.instagram.com/bizvisionary011/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 flex items-center justify-center bg-pink-500 text-white rounded-full hover:bg-pink-600 transition-colors"
                  >
                    <i className="fab fa-instagram"></i>
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Bottom Section with Gray Background */}
      <section className="bg-gray-200 py-4">
        <div className="container mx-auto px-6 lg:px-16 text-center">
          <p className="text-sm text-gray-600">
            ©️ {currentYear} Ethics - BizVisionary. All Rights Reserved.
          </p>
        </div>
      </section>
    </>
  );
}

export default Footer;
