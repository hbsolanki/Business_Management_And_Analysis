import { Link } from "react-router-dom";

export default function ManageCard({ to, icon: Icon, label }) {
    return (
        <Link
            to={to}
            className="p-6 bg-gray-100 rounded-lg flex items-center justify-center
                 hover:bg-gray-200 transition text-gray-800 font-medium"
        >
            <Icon className="mr-2 text-blue-500 text-lg" />
            {label}
        </Link>
    );
}
