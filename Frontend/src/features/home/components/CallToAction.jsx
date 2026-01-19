import { Link } from "react-router-dom";
import { FaArrowRight } from "react-icons/fa";

export default function CallToAction({ title, description }) {
    return (
        <section className="relative py-20 mt-12 md:mx-12 mb-12 rounded-3xl overflow-hidden shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-700"></div>
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>

            <div className="relative container mx-auto px-6 max-w-4xl text-center">
                <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight mb-6">
                    {title}
                </h2>
                <p className="text-xl md:text-2xl text-blue-100 mb-10 font-light leading-relaxed">
                    {description}
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link
                        to="/owner/register"
                        className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-blue-600 bg-white rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
                    >
                        Sign Up Now
                    </Link>
                    <Link
                        to="/login"
                        className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white border-2 border-white/30 rounded-xl hover:bg-white/10 transition-all duration-300"
                    >
                        Login <FaArrowRight className="ml-2" />
                    </Link>
                </div>
            </div>
        </section>
    );
}
