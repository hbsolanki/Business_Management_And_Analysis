import { useState } from "react";
import { Mail, User, MessageSquare, Send, HelpCircle, Phone, Clock } from "lucide-react";
import toast from "react-hot-toast";

export default function Support() {
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        subject: "",
        message: "",
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        setLoading(true);

        // Construct mailto link
        const mailtoLink = `mailto:sh369921@gmail.com?subject=${encodeURIComponent(
            formData.subject || "Support Request"
        )}&body=${encodeURIComponent(
            `Name: ${formData.name}\nEmail: ${formData.email}\n\nMessage:\n${formData.message}`
        )}`;

        // Open mail client
        window.location.href = mailtoLink;

        toast.success("Opening your email client...");
        setLoading(false);
        setFormData({ name: "", email: "", subject: "", message: "" });
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            {/* Header Section */}
            <div className="text-center mb-16 space-y-6">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-white text-brand-600 shadow-xl shadow-brand-500/10 mb-6 group transition-transform hover:scale-110 duration-300">
                    <HelpCircle className="w-10 h-10 group-hover:rotate-12 transition-transform duration-300" />
                </div>
                <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight">
                    How can we help?
                </h1>
                <p className="text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">
                    Our specialized support team is ready to assist you. Fill out the form below and we'll connect you with the right person.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Contact Info Cards */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-lg shadow-slate-200/50 hover:shadow-xl transition-shadow duration-300">
                        <h3 className="text-xl font-bold mb-6 flex items-center gap-3 text-slate-900">
                            <div className="p-2 bg-brand-50 rounded-xl text-brand-600">
                                <Phone className="w-5 h-5" />
                            </div>
                            Contact Info
                        </h3>
                        <div className="space-y-6 text-slate-600">
                            <p className="text-sm leading-relaxed text-slate-500">
                                For urgent matters, please use the contact form for the quickest response from our designated support channel.
                            </p>
                            <div className="pt-6 border-t border-slate-100">
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Email Support</p>
                                <a href="mailto:sh369921@gmail.com" className="font-bold text-slate-900 hover:text-brand-600 transition-colors text-lg block break-all">
                                    sh369921@gmail.com
                                </a>
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-xl shadow-slate-900/20">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-3">
                            <Clock className="w-5 h-5 text-slate-400" /> Response Time
                        </h3>
                        <p className="text-slate-300 text-sm leading-relaxed">
                            We typically respond to all inquiries within <span className="font-bold text-white">24 hours</span> during business days. Our team is dedicated to sorting your issues out as fast as possible.
                        </p>
                    </div>
                </div>

                {/* Main Form */}
                <div className="lg:col-span-8">
                    <div className="bg-white rounded-3xl p-8 md:p-10 border border-slate-200 shadow-xl shadow-slate-200/50 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-50/50 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>

                        <div className="relative">
                            <h2 className="text-2xl font-bold text-slate-900 mb-8 flex items-center gap-3">
                                <MessageSquare className="w-6 h-6 text-brand-600" />
                                Send us a message
                            </h2>

                            <form onSubmit={handleSubmit} className="space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-2.5">
                                        <label htmlFor="name" className="text-sm font-bold text-slate-700 ml-1">
                                            Full Name
                                        </label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                <User className="h-5 w-5 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
                                            </div>
                                            <input
                                                type="text"
                                                id="name"
                                                name="name"
                                                required
                                                value={formData.name}
                                                onChange={handleChange}
                                                className="block w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all duration-200 font-medium"
                                                placeholder="John Doe"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2.5">
                                        <label htmlFor="email" className="text-sm font-bold text-slate-700 ml-1">
                                            Email Address
                                        </label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                <Mail className="h-5 w-5 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
                                            </div>
                                            <input
                                                type="email"
                                                id="email"
                                                name="email"
                                                required
                                                value={formData.email}
                                                onChange={handleChange}
                                                className="block w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all duration-200 font-medium"
                                                placeholder="john@example.com"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2.5">
                                    <label htmlFor="subject" className="text-sm font-bold text-slate-700 ml-1">
                                        Subject
                                    </label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <HelpCircle className="h-5 w-5 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
                                        </div>
                                        <input
                                            type="text"
                                            id="subject"
                                            name="subject"
                                            required
                                            value={formData.subject}
                                            onChange={handleChange}
                                            className="block w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all duration-200 font-medium"
                                            placeholder="What is this regarding?"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2.5">
                                    <label htmlFor="message" className="text-sm font-bold text-slate-700 ml-1">
                                        Message
                                    </label>
                                    <textarea
                                        id="message"
                                        name="message"
                                        required
                                        rows={6}
                                        value={formData.message}
                                        onChange={handleChange}
                                        className="block w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all duration-200 font-medium resize-none leading-relaxed"
                                        placeholder="Please provide as much detail as possible..."
                                    />
                                </div>

                                <div className="pt-4">
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className={`w-full py-4 px-6 rounded-xl font-bold text-white shadow-lg shadow-brand-500/30 flex items-center justify-center gap-3 transition-all transform active:scale-[0.98] ${loading
                                                ? "bg-slate-400 cursor-not-allowed shadow-none"
                                                : "bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 hover:shadow-xl hover:-translate-y-0.5"
                                            }`}
                                    >
                                        {loading ? (
                                            <>Processing...</>
                                        ) : (
                                            <>
                                                <Send className="h-5 w-5" />
                                                Send Message
                                            </>
                                        )}
                                    </button>
                                    <p className="text-center text-xs font-semibold text-slate-400 mt-6 flex items-center justify-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                        Securely powered by your email client
                                    </p>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
