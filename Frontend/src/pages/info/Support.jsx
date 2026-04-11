import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Clock3, LifeBuoy, Mail, MessageSquare, Send, UserRound } from "lucide-react";
import toast from "react-hot-toast";

const HELP_TOPICS = [
    "Login, role, or permission issues",
    "Invoice, inventory, or product workflow errors",
    "Analytics filters and report validation",
    "Subscription purchase and usage limits",
];

export default function Support() {
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        subject: "",
        message: "",
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = (event) => {
        event.preventDefault();
        setLoading(true);

        const mailtoLink = `mailto:sh369921@gmail.com?subject=${encodeURIComponent(
            formData.subject || "Support Request",
        )}&body=${encodeURIComponent(
            `Name: ${formData.name}\nEmail: ${formData.email}\n\nMessage:\n${formData.message}`,
        )}`;

        window.location.href = mailtoLink;
        toast.success("Opening your email client...");
        setFormData({ name: "", email: "", subject: "", message: "" });
        setLoading(false);
    };

    const handleChange = (event) => {
        setFormData((prev) => ({ ...prev, [event.target.name]: event.target.value }));
    };

    return (
        <div className="space-y-6 pb-8">
            <section className="rounded-3xl border border-slate-200 bg-white shadow-sm p-6 md:p-8">
                <Link
                    to="/info"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to overview
                </Link>

                <div className="mt-3 flex items-start gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                        <LifeBuoy className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">Support Center</h1>
                        <p className="mt-2 text-slate-600 max-w-3xl">
                            Share your issue with clear context and module details. We usually respond within 24 hours on business days.
                        </p>
                    </div>
                </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-12">
                <div className="lg:col-span-4 space-y-4">
                    <article className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5">
                        <h2 className="text-base font-semibold text-slate-900">Support Contact</h2>
                        <a href="mailto:sh369921@gmail.com" className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-brand-700 break-all">
                            <Mail className="h-4 w-4" />
                            sh369921@gmail.com
                        </a>
                    </article>

                    <article className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5">
                        <h2 className="text-base font-semibold text-slate-900">Common Topics</h2>
                        <ul className="mt-3 space-y-2">
                            {HELP_TOPICS.map((topic) => (
                                <li key={topic} className="text-sm text-slate-600 flex items-start gap-2">
                                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-slate-400 shrink-0" />
                                    <span>{topic}</span>
                                </li>
                            ))}
                        </ul>
                    </article>

                    <article className="rounded-2xl border border-slate-200 bg-slate-900 p-5 text-white">
                        <h2 className="text-base font-semibold flex items-center gap-2">
                            <Clock3 className="h-4 w-4" />
                            Response Time
                        </h2>
                        <p className="mt-2 text-sm text-slate-300">
                            Typical response window: within 24 hours during business days.
                        </p>
                    </article>
                </div>

                <div className="lg:col-span-8">
                    <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 md:p-8 space-y-5">
                        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            <MessageSquare className="h-5 w-5" />
                            Submit a support request
                        </h2>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <label htmlFor="name">Full Name</label>
                                <div className="relative">
                                    <UserRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    <input
                                        id="name"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        required
                                        className="w-full input-icon-left"
                                        placeholder="John Doe"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="email">Email</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    <input
                                        id="email"
                                        name="email"
                                        type="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        required
                                        className="w-full input-icon-left"
                                        placeholder="john@example.com"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="subject">Subject</label>
                            <input
                                id="subject"
                                name="subject"
                                value={formData.subject}
                                onChange={handleChange}
                                required
                                placeholder="Brief summary of the issue"
                                className="w-full"
                            />
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="message">Message</label>
                            <textarea
                                id="message"
                                name="message"
                                rows={6}
                                value={formData.message}
                                onChange={handleChange}
                                required
                                placeholder="Include module name, steps to reproduce, and expected outcome."
                                className="w-full"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full rounded-xl px-4 py-3 text-sm font-semibold text-white flex items-center justify-center gap-2 transition-colors ${loading ? "bg-slate-400 cursor-not-allowed" : "bg-slate-900 hover:bg-slate-800"}`}
                        >
                            <Send className="h-4 w-4" />
                            {loading ? "Processing..." : "Open email client"}
                        </button>
                    </form>
                </div>
            </section>
        </div>
    );
}
