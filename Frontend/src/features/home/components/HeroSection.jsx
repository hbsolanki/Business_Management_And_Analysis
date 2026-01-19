import { useState } from "react";
import { Link } from "react-router-dom";
import { FaArrowRight, FaPlay, FaTimes } from "react-icons/fa";
import { Dialog, DialogPanel } from "@headlessui/react";
import app_owner_dashboard from "../../../assets/Home/app_owner_dashboard_BMA.png";


export default function HeroSection() {
    const [isVideoOpen, setIsVideoOpen] = useState(false);

    return (
        <div className="relative isolate overflow-hidden bg-white">
            <svg
                className="absolute inset-0 -z-10 h-full w-full stroke-gray-200 [mask-image:radial-gradient(100%_100%_at_top_right,white,transparent)]"
                aria-hidden="true"
            >
                <defs>
                    <pattern
                        id="0787a7c5-978c-4f66-83c7-11c213f99cb7"
                        width={200}
                        height={200}
                        x="50%"
                        y={-1}
                        patternUnits="userSpaceOnUse"
                    >
                        <path d="M.5 200V.5H200" fill="none" />
                    </pattern>
                </defs>
                <rect
                    width="100%"
                    height="100%"
                    strokeWidth={0}
                    fill="url(#0787a7c5-978c-4f66-83c7-11c213f99cb7)"
                />
            </svg>
            <div className="mx-auto max-w-7xl px-6 pb-24 pt-10 sm:pb-20 lg:flex lg:px-8 lg:py-20">
                <div className="mx-auto max-w-2xl lg:mx-0 lg:max-w-xl lg:flex-shrink-0 lg:pt-8">
                    <div className="mt-24 sm:mt-32 lg:mt-16">
                        <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-600 ring-1 ring-inset ring-blue-600/10 mb-6">
                            Version 2.0 is here
                        </span>
                    </div>
                    <h1 className="mt-2 text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                        Empowering Business Through Data-Driven Insights
                    </h1>
                    <p className="mt-6 text-lg leading-8 text-gray-600">
                        Our platform helps you streamline operations, make informed
                        decisions, and grow your business with advanced analytics and
                        insights. Optimize every aspect of your business with real-time
                        data.
                    </p>

                    {/* Added Mini-Features to fill space */}
                    <div className="mt-6 flex gap-4 text-sm font-medium text-gray-500">
                        <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> 99.9% Uptime</div>
                        <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> 24/7 Support</div>
                        <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500"></span> Secure Data</div>
                    </div>
                    <div className="mt-10 flex items-center gap-x-6">
                        <Link
                            to="/owner/register"
                            className="rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-500/30 hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition-all hover:scale-105 flex items-center gap-2"
                        >
                            Get Started <FaArrowRight />
                        </Link>
                        <button
                            onClick={() => setIsVideoOpen(true)}
                            className="text-sm font-bold leading-6 text-gray-900 flex items-center gap-2 hover:text-blue-600 transition cursor-pointer"
                        >
                            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                                <FaPlay size={10} />
                            </div>
                            Live Demo
                        </button>
                    </div>
                </div>
                <div className="mx-auto mt-16 flex max-w-2xl sm:mt-24 lg:ml-10 lg:mt-0 lg:mr-0 lg:max-w-none lg:flex-none xl:ml-32">
                    <div className="max-w-3xl flex-none sm:max-w-5xl lg:max-w-none">
                        <div className="-m-2 rounded-xl bg-gray-900/5 p-2 ring-1 ring-inset ring-gray-900/10 lg:-m-4 lg:rounded-2xl lg:p-4">
                            <img
                                src={app_owner_dashboard}
                                alt="App screenshot"
                                width={2432}
                                height={1442}
                                className="w-[76rem] rounded-md shadow-2xl ring-1 ring-gray-900/10"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Video Modal */}
            <Dialog open={isVideoOpen} onClose={() => setIsVideoOpen(false)} className="relative z-50">
                {/* Backdrop */}
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" aria-hidden="true" />

                {/* Container */}
                <div className="fixed inset-0 flex items-center justify-center p-4">
                    <DialogPanel className="w-full max-w-4xl rounded-2xl bg-black p-1 shadow-2xl ring-1 ring-white/10 relative">
                        <button
                            onClick={() => setIsVideoOpen(false)}
                            className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors p-2"
                        >
                            <span className="sr-only">Close</span>
                            <FaTimes size={24} />
                        </button>

                        <div className="aspect-video w-full rounded-xl overflow-hidden bg-gray-900">
                            {/* Placeholder Video - Replace 'video_id' with your actual YouTube ID */}
                            <iframe
                                className="w-full h-full"
                                src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1&mute=1"
                                title="App Demo"
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            ></iframe>
                        </div>
                    </DialogPanel>
                </div>
            </Dialog>
        </div >
    );
}
