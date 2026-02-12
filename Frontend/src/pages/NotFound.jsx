import { Link } from "react-router-dom";
import { FaHome, FaExclamationTriangle } from "react-icons/fa";

export default function PageNotFound() {
  return (
    <main className="relative grid min-h-screen place-items-center px-6 py-24 sm:py-32 lg:px-8">
      <div className="absolute inset-0 -z-10 bg-grid-slate opacity-40"></div>
      <div className="text-center max-w-xl">
        <FaExclamationTriangle className="mx-auto h-20 w-20 text-amber-500 mb-6" />
        <p className="text-xs font-semibold text-brand-700 uppercase tracking-[0.3em]">404 Error</p>
        <h1 className="mt-4 text-5xl font-semibold text-slate-900 sm:text-7xl">
          Page not found
        </h1>
        <p className="mt-6 text-xl leading-8 text-slate-600">
          Sorry, we couldn’t find the page you’re looking for.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            to="/"
            className="rounded-full bg-brand-600 px-6 py-3.5 text-sm font-semibold text-white shadow-glow hover:bg-brand-700 flex items-center gap-2 transition-transform hover:scale-105"
          >
            <FaHome />
            Go back home
          </Link>
          <a href="#" className="text-sm font-semibold text-slate-700 hover:text-brand-700">
            Contact support <span aria-hidden="true">&rarr;</span>
          </a>
        </div>
      </div>
    </main>
  );
}
