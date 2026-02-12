import { Link } from "react-router-dom";

export default function ManageCard({ to, icon: Icon, label }) {
    return (
        <Link
            to={to}
            className="p-6 bg-white/80 rounded-lg flex items-center justify-center
                 hover:bg-white/90 transition text-gray-800 font-medium"
        >
            <Icon className="mr-2 text-brand-500 text-lg" />
            {label}
        </Link>
    );
}
