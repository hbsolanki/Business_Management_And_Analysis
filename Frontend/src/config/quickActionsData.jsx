import {
    FaCrown,
    FaChartLine,
    FaUsers,
    FaBoxOpen,
    FaCashRegister,
    FaProductHunt,
    FaLayerGroup,
    FaInfoCircle,
    FaBriefcase,
    FaFileInvoiceDollar,
    FaUserPlus,
    FaMoneyBillWave,
    FaTags,
    FaThLarge,
    FaExchangeAlt,
    FaComments,
    FaUserTie
} from "react-icons/fa";

export const OWNER_ACTIONS = {
    // Navigation / Views
    dashboard: {
        id: "dashboard",
        label: "Dashboard",
        path: "/owner",
        icon: <FaCrown />,
        desc: "Overview & Stats",
        color: "text-brand-600",
        bg: "bg-brand-50 hover:bg-brand-100"
    },
    analytics: {
        id: "analytics",
        label: "Analytics",
        path: "/analytics",
        icon: <FaChartLine />,
        desc: "Performance Data",
        color: "text-indigo-600",
        bg: "bg-indigo-50 hover:bg-indigo-100"
    },
    chat: {
        id: "chat",
        label: "Chat",
        path: "/chat",
        icon: <FaComments />,
        desc: "Team Chat",
        color: "text-teal-600",
        bg: "bg-teal-50 hover:bg-teal-100"
    },
    employees: {
        id: "employees",
        label: "Manage Employees",
        path: "/employees/manage",
        icon: <FaUsers />,
        desc: "Staff Management",
        color: "text-purple-600",
        bg: "bg-purple-50 hover:bg-purple-100"
    },
    inventory: {
        id: "inventory",
        label: "Inventory",
        path: "/inventory",
        icon: <FaBoxOpen />,
        desc: "Stock Levels",
        color: "text-orange-600",
        bg: "bg-orange-50 hover:bg-orange-100"
    },
    invoices: {
        id: "invoices",
        label: "Invoices",
        path: "/invoice",
        icon: <FaCashRegister />,
        desc: "Billing & History",
        color: "text-emerald-600",
        bg: "bg-emerald-50 hover:bg-emerald-100"
    },
    products: {
        id: "products",
        label: "Products",
        path: "/product",
        icon: <FaProductHunt />,
        desc: "Catalog Item",
        color: "text-pink-600",
        bg: "bg-pink-50 hover:bg-pink-100"
    },
    cost: {
        id: "cost",
        label: "Cost Categories",
        path: "/cost-category",
        icon: <FaLayerGroup />,
        desc: "Expense Types",
        color: "text-rose-600",
        bg: "bg-rose-50 hover:bg-rose-100"
    },
    info: {
        id: "info",
        label: "Info Hub",
        path: "/info",
        icon: <FaInfoCircle />,
        desc: "Help & Resources",
        color: "text-cyan-600",
        bg: "bg-cyan-50 hover:bg-cyan-100"
    },

    // Actions / Creation
    newInvoice: {
        id: "newInvoice",
        label: "New Invoice",
        path: "/invoice/new",
        icon: <FaFileInvoiceDollar />,
        desc: "Create Bill",
        color: "text-emerald-600",
        bg: "bg-emerald-50 hover:bg-emerald-100"
    },
    addProduct: {
        id: "addProduct",
        label: "Add Product",
        path: "/product/add",
        icon: <FaProductHunt />,
        desc: "New Inventory",
        color: "text-orange-600",
        bg: "bg-orange-50 hover:bg-orange-100"
    },
    addEmployee: {
        id: "addEmployee",
        label: "Add Employee",
        path: "/employee/new",
        icon: <FaUserPlus />,
        desc: "Onboard Staff",
        color: "text-brand-600",
        bg: "bg-brand-50 hover:bg-brand-100"
    },
    addManager: {
        id: "addManager",
        label: "Add Manager",
        path: "/manager/new",
        icon: <FaUserTie />,
        desc: "New Manager",
        color: "text-indigo-600",
        bg: "bg-indigo-50 hover:bg-indigo-100"
    },
    recordCost: {
        id: "recordCost",
        label: "Record Cost",
        path: "/cost-category/month",
        icon: <FaMoneyBillWave />,
        desc: "Track Expense",
        color: "text-rose-600",
        bg: "bg-rose-50 hover:bg-rose-100"
    },
};

export const MANAGER_ACTIONS = {
    // Navigation / Views
    dashboard: {
        id: "dashboard",
        label: "Dashboard",
        path: "/manager",
        icon: <FaBriefcase />,
        desc: "Overview",
        color: "text-purple-600",
        bg: "bg-purple-50 hover:bg-purple-100"
    },
    analytics: {
        id: "analytics",
        label: "Analytics",
        path: "/analytics",
        icon: <FaChartLine />,
        desc: "Data Reports",
        color: "text-indigo-600",
        bg: "bg-indigo-50 hover:bg-indigo-100"
    },
    chat: {
        id: "chat",
        label: "Chat",
        path: "/chat",
        icon: <FaComments />,
        desc: "Team Chat",
        color: "text-teal-600",
        bg: "bg-teal-50 hover:bg-teal-100"
    },
    employees: {
        id: "employees",
        label: "Manage Employees",
        path: "/employees/manage",
        icon: <FaUsers />,
        desc: "Staff List",
        color: "text-brand-600",
        bg: "bg-brand-50 hover:bg-brand-100"
    },
    inventory: {
        id: "inventory",
        label: "Inventory",
        path: "/inventory",
        icon: <FaBoxOpen />,
        desc: "Stock Management",
        color: "text-orange-600",
        bg: "bg-orange-50 hover:bg-orange-100"
    },
    invoices: {
        id: "invoices",
        label: "Invoices",
        path: "/invoice",
        icon: <FaCashRegister />,
        desc: "View Invoices",
        color: "text-emerald-600",
        bg: "bg-emerald-50 hover:bg-emerald-100"
    },
    products: {
        id: "products",
        label: "Products",
        path: "/product",
        icon: <FaProductHunt />,
        desc: "View Products",
        color: "text-pink-600",
        bg: "bg-pink-50 hover:bg-pink-100"
    },
    cost: {
        id: "cost",
        label: "Cost Categories",
        path: "/cost-category",
        icon: <FaLayerGroup />,
        desc: "Manage Costs",
        color: "text-rose-600",
        bg: "bg-rose-50 hover:bg-rose-100"
    },
    info: {
        id: "info",
        label: "Info Hub",
        path: "/info",
        icon: <FaInfoCircle />,
        desc: "Resources",
        color: "text-cyan-600",
        bg: "bg-cyan-50 hover:bg-cyan-100"
    },

    // Actions / Creation
    newInvoice: {
        id: "newInvoice",
        label: "New Invoice",
        path: "/invoice/new",
        icon: <FaFileInvoiceDollar />,
        desc: "Create Bill",
        color: "text-emerald-600",
        bg: "bg-emerald-50 hover:bg-emerald-100"
    },
    addProduct: {
        id: "addProduct",
        label: "Add Product",
        path: "/product/add",
        icon: <FaProductHunt />,
        desc: "New Item",
        color: "text-orange-600",
        bg: "bg-orange-50 hover:bg-orange-100"
    },
    addEmployee: {
        id: "addEmployee",
        label: "Add Employee",
        path: "/employee/new",
        icon: <FaUserPlus />,
        desc: "New Hire",
        color: "text-brand-600",
        bg: "bg-brand-50 hover:bg-brand-100"
    },
    recordCost: {
        id: "recordCost",
        label: "Record Cost",
        path: "/cost-category/month",
        icon: <FaTags />,
        desc: "Log Expense",
        color: "text-rose-600",
        bg: "bg-rose-50 hover:bg-rose-100"
    },
};


export const EMPLOYEE_ACTIONS = {
    // Navigation / Views
    dashboard: {
        id: "dashboard",
        label: "Dashboard",
        path: "/employee",
        icon: <FaThLarge />,
        desc: "Overview",
        color: "text-green-600",
        bg: "bg-green-50 hover:bg-green-100"
    },
    chat: {
        id: "chat",
        label: "Chat",
        path: "/chat",
        icon: <FaComments />,
        desc: "Team Chat",
        color: "text-teal-600",
        bg: "bg-teal-50 hover:bg-teal-100"
    },
    info: {
        id: "info",
        label: "Info Hub",
        path: "/info",
        icon: <FaInfoCircle />,
        desc: "Resources",
        color: "text-cyan-600",
        bg: "bg-cyan-50 hover:bg-cyan-100"
    },
    inventory: {
        id: "inventory",
        label: "Inventory",
        path: "/inventory",
        icon: <FaBoxOpen />,
        desc: "Stock List",
        color: "text-orange-600",
        bg: "bg-orange-50 hover:bg-orange-100"
    },
    invoices: {
        id: "invoices",
        label: "Invoices",
        path: "/invoice",
        icon: <FaCashRegister />,
        desc: "View Invoices",
        color: "text-emerald-600",
        bg: "bg-emerald-50 hover:bg-emerald-100"
    },
    products: {
        id: "products",
        label: "Products",
        path: "/product",
        icon: <FaProductHunt />,
        desc: "View Products",
        color: "text-pink-600",
        bg: "bg-pink-50 hover:bg-pink-100"
    },

    // Actions / Creation
    newInvoice: {
        id: "newInvoice",
        label: "New Invoice",
        path: "/invoice/new",
        icon: <FaFileInvoiceDollar />,
        desc: "Create Bill",
        color: "text-emerald-600",
        bg: "bg-emerald-50 hover:bg-emerald-100"
    },
    addProduct: {
        id: "addProduct",
        label: "Add Product",
        path: "/product/add",
        icon: <FaProductHunt />,
        desc: "New Item",
        color: "text-orange-600",
        bg: "bg-orange-50 hover:bg-orange-100"
    },
    newTransaction: {
        id: "newTransaction",
        label: "New Transaction",
        path: "/inventory/transaction/new",
        icon: <FaExchangeAlt />,
        desc: "Move Stock",
        color: "text-purple-600",
        bg: "bg-purple-50 hover:bg-purple-100"
    }
};
