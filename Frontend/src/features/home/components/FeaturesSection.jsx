import {
    FaBoxOpen,
    FaUsers,
    FaChartPie,
    FaMoneyBillWave,
    FaChartLine,
    FaShieldAlt,
    FaEnvelopeOpenText,
} from "react-icons/fa";

const features = [
    {
        title: "Smart Invoicing",
        description:
            "Generate professional invoices and automatically email them to your customers in one click.",
        icon: <FaEnvelopeOpenText className="text-white text-2xl" />,
        color: "bg-teal-500",
    },
    {
        title: "Inventory Management",
        description:
            "Keep track of stock levels, monitor inventory movement, and ensure you never run out of critical items.",
        icon: <FaBoxOpen className="text-white text-2xl" />,
        color: "bg-blue-500",
    },
    {
        title: "Employee Management",
        description:
            "Organize your workforce efficiently with tools to manage roles, schedules, and performance.",
        icon: <FaUsers className="text-white text-2xl" />,
        color: "bg-indigo-500",
    },
    {
        title: "Sales Tracking",
        description:
            "Monitor sales trends and revenue growth with intuitive dashboards and reports in real-time.",
        icon: <FaChartLine className="text-white text-2xl" />,
        color: "bg-green-500",
    },
    {
        title: "Data Visualization",
        description:
            "Analyze key metrics with powerful charts, graphs, and reports to make informed decisions.",
        icon: <FaChartPie className="text-white text-2xl" />,
        color: "bg-purple-500",
    },
    {
        title: "Financial Insights",
        description:
            "Track expenses, manage payroll, and get a clear view of your financial health.",
        icon: <FaMoneyBillWave className="text-white text-2xl" />,
        color: "bg-yellow-500",
    },
    {
        title: "Secure Access",
        description:
            "Role-based access control ensures your data is safe and only accessible to authorized personnel.",
        icon: <FaShieldAlt className="text-white text-2xl" />,
        color: "bg-red-500",
    },
];

export default function FeaturesSection() {
    return (
        <section className="bg-gray-50 py-24 md:mx-12 md:mt-12 rounded-3xl">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <h2 className="text-base font-bold text-blue-600 uppercase tracking-wide">
                        Everything you need
                    </h2>
                    <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-700">
                        All-in-one Platform for Business Growth
                    </p>
                    <p className="mt-4 text-xl text-gray-500">
                        Our platform provides comprehensive tools to manage every aspect of
                        your business operation seamlessy.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {features.map((feature, index) => (
                        <div
                            key={index}
                            className="bg-white rounded-2xl p-8 shadow-md hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 border border-gray-100 group"
                        >
                            <div
                                className={`w-14 h-14 rounded-xl flex items-center justify-center mb-6 shadow-lg transform group-hover:scale-110 transition-transform ${feature.color}`}
                            >
                                {feature.icon}
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">
                                {feature.title}
                            </h3>
                            <p className="text-gray-500 leading-relaxed">
                                {feature.description}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
