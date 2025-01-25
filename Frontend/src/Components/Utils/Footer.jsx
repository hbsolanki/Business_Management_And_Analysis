const currentYear = new Date().getFullYear();
import "@fortawesome/fontawesome-free/css/all.min.css";

function Footer() {
  return (
    <>
      {/* Footer Section */}
      <section className="footer1 mt-6 bg-gray-600 text-white py-8">
        <div className="container mx-auto px-6 lg:px-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center md:text-left">
            {/* Column 1 */}
            <div>
              <h3 className="text-2xl font-semibold">About Us</h3>
              <p className="text-sm mt-4 leading-relaxed">
                We know that good management and smart analysis are essential
                for succeeding in today’s complicated business world. Our
                customized solutions help businesses make the best use of their
                resources, streamline their processes, and use data to make
                better decisions.
              </p>
            </div>
            {/* Column 2 */}
            <div>
              <h3 className="text-2xl font-semibold">Contact Us</h3>
              <div className="mt-4 space-y-2">
                <p className="text-sm">Ahmedabad</p>
                <p className="text-sm">Phone: +91 8160062665</p>
                <p className="text-sm">Email: info@bizvissionary.biz</p>
              </div>
            </div>
            {/* Column 3 */}
            <div>
              <h3 className="text-2xl font-semibold">Social Media</h3>
              <ul className="flex justify-center md:justify-start space-x-6 mt-6">
                <li>
                  <a
                    href="https://www.facebook.com/bizvisionary011"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="footer5 flex items-center justify-center w-10 h-10 bg-black text-white rounded-full hover:bg-blue-600 transition-colors"
                  >
                    <i className="fab fa-facebook-f"></i>
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.linkedin.com/in/bizvisionary011/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="footer5 flex items-center justify-center w-10 h-10 bg-black text-white rounded-full hover:bg-blue-700 transition-colors"
                  >
                    <i className="fab fa-linkedin"></i>
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.instagram.com/bizvisionary011/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="footer5 flex items-center justify-center w-10 h-10 bg-black text-white rounded-full hover:bg-pink-500 transition-colors"
                  >
                    <i className="fab fa-instagram"></i>
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Bottom Section */}
      <section className="footer1 bg-gray-800">
        <div className="container mx-auto px-6 lg:px-16 text-center py-4">
          <p className="text-white text-sm">
            ©️ {currentYear} BizVisionary. All Rights Reserved.
          </p>
        </div>
      </section>
    </>
  );
}

export default Footer;
