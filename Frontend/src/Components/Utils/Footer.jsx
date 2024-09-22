import { Typography } from "@material-tailwind/react";
const currentYear = new Date().getFullYear();
import "@fortawesome/fontawesome-free/css/all.min.css";

function Footer() {
  return (
    <>
      {/* Footer Section */}
      <section className="footer1 mt-4 bg-gray-600 text-white py-6">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {/* Column 1 */}
            <div className="col-span-1 ml-10">
              <h3 className="mt-3 text-xl font-bold">About Us</h3>
              <p className="text-sm mt-2">
                We know that good management and smart analysis are essential
                for succeeding in today’s complicated business world. Our
                customized solutions help businesses make the best use of their
                resources, streamline their processes, and use data to make
                better decisions.
              </p>
            </div>
            {/* Column 2 */}
            <div className="col-span-1 ml-20">
              <h2 className="mt-3 text-xl font-bold">Contact Us</h2>
              <p className="mt-2 text-sm">Ahmedabad</p>
              <p className="text-sm">Phone : +91 9724013899</p>
              <p className="text-sm">Email : info@bizvissionary.biz</p>
            </div>
            {/* Column 3 */}
            <div className="col-span-1 ml-10">
              <h3 className="mt-3 text-xl font-bold">Social Media</h3>
              <ul className="flex space-x-4 mt-4">
                <li>
                  <a
                    href="https://www.facebook.com/harsh.vaghela.1272010/"
                    className="footer5 flex items-center justify-center w-12 h-12 bg-black text-white rounded-full text-lg"
                  >
                    <i className="fab fa-facebook-f"></i>
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.linkedin.com/in/harsh-vaghela-5b1344298/"
                    className="footer5 flex items-center justify-center w-12 h-12 bg-black text-white rounded-full text-lg"
                  >
                    <i className="fab fa-linkedin"></i>
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.instagram.com/vaghela_harsh_4840/"
                    className="footer5 flex items-center justify-center w-12 h-12 bg-black text-white rounded-full text-lg"
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
      <section className="footer1 bg-gray-800 h-12">
        <div className="container mx-auto px-4 text-center py-3">
          <p className="text-white text-sm">
            ©️ 2024 BizVisionary. All Rights Reserved.
          </p>
        </div>
      </section>
    </>
  );
}

export default Footer;
