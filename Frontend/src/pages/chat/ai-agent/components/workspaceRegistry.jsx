import React from "react";
import { 
  FaCodeBranch, 
  FaBoxOpen, 
  FaTags, 
  FaBookOpen, 
  FaFileInvoiceDollar, 
  FaFileInvoice, 
  FaTasks, 
  FaChartBar, 
  FaHandshake, 
  FaShoppingCart, 
  FaStore, 
  FaUserShield, 
  FaGem,
  FaRobot
} from "react-icons/fa";

import AddBranch from "@/pages/business/AddBranch";
import EditBranch from "@/pages/business/EditBranch";
import AddProduct from "@/pages/product/AddProduct";
import EditProduct from "@/pages/product/EditProduct";
import AddCategory from "@/pages/product/AddCategory";
import EditCategory from "@/pages/product/EditCategory";
import CostCategoryModal from "@/features/costCategory/components/CostCategoryModal";
import MonthlyCostCategoryForm from "@/features/costCategory/components/MonthlyCostCategoryForm";
import AddExpense from "@/pages/cost/AddExpense";
import CreateTaskModal from "@/features/task/components/CreateTaskModal";
import AnalyticsReportGenerator from "@/pages/analytics/AnalyticsReportGenerator";

import AddVendor from "@/pages/supplier/AddVendor";
import AddPurchaseOrder from "@/pages/supplier/AddPurchaseOrder";
import EditPurchaseOrder from "@/pages/supplier/EditPurchaseOrder";
import AddSaleOrder from "@/pages/supplier/AddSaleOrder";
import EditSaleOrder from "@/pages/supplier/EditSaleOrder";
import AddCustomer from "@/pages/supplier/AddCustomer";
import AddInvoice from "@/pages/invoice/AddInvoice";
import PlansSection from "@/features/subscription/components/PlansSection";
import ReminderForm from "@/features/reminder/components/ReminderForm";
import { FaBell } from "react-icons/fa";

export const getWorkspaceDetails = (type) => {
  switch (type) {
    case "add_branch":
      return {
        title: "Branch Configuration",
        subtitle: "Establish a new commercial location",
        icon: <FaCodeBranch size={13} />
      };
    case "edit_branch":
      return {
        title: "Modify Branch Details",
        subtitle: "Update location details and settings",
        icon: <FaCodeBranch size={13} />
      };
    case "add_product":
      return {
        title: "Product Registry",
        subtitle: "Catalog a new item in the matrix",
        icon: <FaBoxOpen size={13} />
      };
    case "edit_product":
      return {
        title: "Edit Product Details",
        subtitle: "Update pricing, description or categories",
        icon: <FaBoxOpen size={13} />
      };
    case "add_product_category":
    case "edit_product_category":
      return {
        title: "Category Registry",
        subtitle: "Organize inventory classifications",
        icon: <FaTags size={13} />
      };
    case "add_cost_category":
    case "edit_cost_category":
      return {
        title: "Cost Center Configuration",
        subtitle: "Manage bookkeeping categorization",
        icon: <FaBookOpen size={13} />
      };
    case "add_monthly_cost":
    case "edit_monthly_cost":
      return {
        title: "Monthly Operational Cost",
        subtitle: "Log administrative and fixed expenses",
        icon: <FaFileInvoiceDollar size={13} />
      };
    case "add_expense":
      return {
        title: "Expense Registry",
        subtitle: "Log a new transactional purchase",
        icon: <FaFileInvoice size={13} />
      };
    case "edit_expense":
      return {
        title: "Modify Expense details",
        subtitle: "Update transactional record details",
        icon: <FaFileInvoice size={13} />
      };
    case "add_task":
    case "edit_task":
      return {
        title: "Operational Task Management",
        subtitle: "Assign and schedule team milestones",
        icon: <FaTasks size={13} />
      };
    case "add_reminder":
      return {
        title: "Background Reminder Alert",
        subtitle: "Schedule a recurring or one-time notification alert",
        icon: <FaBell size={13} />
      };
    case "edit_reminder":
      return {
        title: "Modify Reminder Alert",
        subtitle: "Reschedule or update reminder details",
        icon: <FaBell size={13} />
      };
    case "generate_report":
      return {
        title: "System Analytics Engine",
        subtitle: "Synthesize real-time operational reports",
        icon: <FaChartBar size={13} />
      };
    case "add_supplier":
    case "edit_supplier":
      return {
        title: "Vendor Registry",
        subtitle: "Manage supply-chain relationships",
        icon: <FaHandshake size={13} />
      };
    case "add_purchase_order":
    case "edit_purchase_order":
      return {
        title: "Purchase Order Ledger",
        subtitle: "Procure and track stock from vendors",
        icon: <FaShoppingCart size={13} />
      };
    case "add_sales_order":
    case "edit_sales_order":
      return {
        title: "Sales Order Pipeline",
        subtitle: "Register wholesale outbound demand",
        icon: <FaStore size={13} />
      };
    case "add_customer":
    case "edit_customer":
      return {
        title: "Customer Registry",
        subtitle: "Track relationship profiles and details",
        icon: <FaUserShield size={13} />
      };
    case "add_invoice":
    case "edit_invoice":
      return {
        title: "Invoice Issuance Terminal",
        subtitle: "Generate clean financial transactions",
        icon: <FaFileInvoiceDollar size={13} />
      };
    case "view_plans":
      return {
        title: "Enterprise Subscription Tiers",
        subtitle: "Unlock analytical and computational capabilities",
        icon: <FaGem size={13} />
      };
    default:
      return {
        title: "Operational Workspace",
        subtitle: "Manage active business records",
        icon: <FaRobot size={13} />
      };
  }
};

export const renderWorkspaceContent = (config) => {
  if (!config) return null;
  switch (config.type) {
    case "add_branch":
      return <AddBranch isEmbed={true} initialData={config.initial_data} onComplete={config.onComplete} />;
    case "edit_branch":
      return <EditBranch isEmbed={true} id={config.id} onComplete={config.onComplete} />;
    case "add_product":
      return <AddProduct isEmbed={true} initialData={config.initial_data} onComplete={config.onComplete} />;
    case "edit_product":
      return <EditProduct isEmbed={true} id={config.id} onComplete={config.onComplete} />;
    case "add_product_category":
      return <AddCategory isEmbed={true} initialData={config.initial_data} onComplete={config.onComplete} />;
    case "edit_product_category":
      return <EditCategory isEmbed={true} id={config.id} onComplete={config.onComplete} />;
    case "add_cost_category":
      return <CostCategoryModal isEmbed={true} initialData={config.initial_data} onSaved={config.onComplete} />;
    case "edit_cost_category":
      return <CostCategoryModal isEmbed={true} id={config.id} onSaved={config.onComplete} />;
    case "add_monthly_cost":
      return (
        <MonthlyCostCategoryForm 
          isEmbed={true} 
          onSaved={config.onComplete} 
          initialBranchId={config.branch_id}
          initialMonth={config.month}
          initialYear={config.year}
        />
      );
    case "edit_monthly_cost":
      return <MonthlyCostCategoryForm isEmbed={true} id={config.id} onSaved={config.onComplete} />;
    case "add_expense":
      return <AddExpense isEmbed={true} initialData={config.initial_data} onComplete={config.onComplete} />;
    case "edit_expense":
      return <AddExpense isEmbed={true} id={config.id} onComplete={config.onComplete} />;
    case "add_task":
      return <CreateTaskModal isEmbed={true} initialData={config.initial_data} onComplete={config.onComplete} />;
    case "edit_task":
      return <CreateTaskModal isEmbed={true} id={config.id} onComplete={config.onComplete} />;
    case "add_reminder":
      return <ReminderForm isEmbed={true} initialData={config.initial_data} onComplete={config.onComplete} />;
    case "edit_reminder":
      return <ReminderForm isEmbed={true} id={config.id} onComplete={config.onComplete} />;
    case "generate_report":
      return <AnalyticsReportGenerator isEmbed={true} onComplete={config.onComplete} />;
    case "add_supplier":
      return <AddVendor isEmbed={true} initialData={config.initial_data} onComplete={config.onComplete} />;
    case "edit_supplier":
      return <AddVendor isEmbed={true} id={config.id} onComplete={config.onComplete} />;
    case "add_purchase_order":
      return <AddPurchaseOrder isEmbed={true} initialData={config.initial_data} onComplete={config.onComplete} />;
    case "edit_purchase_order":
      return <EditPurchaseOrder isEmbed={true} id={config.id} onComplete={config.onComplete} />;
    case "add_sales_order":
      return <AddSaleOrder isEmbed={true} initialData={config.initial_data} onComplete={config.onComplete} />;
    case "edit_sales_order":
      return <EditSaleOrder isEmbed={true} id={config.id} onComplete={config.onComplete} />;
    case "add_customer":
      return <AddCustomer isEmbed={true} initialData={config.initial_data} onComplete={config.onComplete} />;
    case "edit_customer":
      return <AddCustomer isEmbed={true} id={config.id} onComplete={config.onComplete} />;
    case "add_invoice":
      return <AddInvoice isEmbed={true} initialData={config.initial_data} onComplete={config.onComplete} />;
    case "view_plans":
      return <PlansSection isEmbed={true} onComplete={config.onComplete} />;
    default:
      return <div className="p-8 text-slate-400 font-bold uppercase tracking-widest text-xs">Unknown Component Type</div>;
  }
};
