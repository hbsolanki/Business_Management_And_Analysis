import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import { Toaster } from "react-hot-toast";

import PublicRoute from "@/features/auth/routes/PublicRoute";
import PrivateRoute from "@/features/auth/routes/PrivateRoute";

// lazy imports
const Home = lazy(() => import("@/pages/Home"));
const OwnerRegistration = lazy(() =>
  import("@/pages/auth/OwnerRegister")
);
const Login = lazy(() => import("@/pages/auth/Login"));
const Owner = lazy(() => import("@/pages/owner/Dashboard"));
const OwnerEdit = lazy(() => import("@/pages/owner/EditProfile"));
const Product = lazy(() => import("@/pages/product/ProductList"));
const ProductAdd = lazy(() => import("@/pages/product/AddProduct"));
const ProductEdit = lazy(() => import("@/pages/product/EditProduct"));
const CreateBusiness = lazy(() => import("@/pages/business/CreateBusiness"));

// inventory
const Inventory = lazy(() => import("@/pages/inventory/InventoryList"));
const InventoryTransactionCreate = lazy(() =>
  import("@/pages/inventory/AddTransaction")
);

const BusinessEdit = lazy(() => import("@/pages/business/EditBusiness"));

// invoice
const InvoiceNew = lazy(() => import("@/pages/invoice/AddInvoice"));
const Invoice = lazy(() => import("@/pages/invoice/InvoiceList"));

// Cost Category
const CostCategoryList = lazy(() => import("@/features/costCategory/components/CostCategoryList"));

// employee
const EmployeesManage = lazy(() => import("@/pages/employee/EmployeeList"));
const EmployeesNew = lazy(() => import("@/pages/employee/AddEmployee"));
const EmployeeEdit = lazy(() => import("@/pages/employee/EditEmployee"));
const EmployeeSelfEdit = lazy(() => import("@/pages/employee/EditProfile"));
const Employee = lazy(() => import("@/pages/employee/Dashboard"));

//Analysis
const Analytics = lazy(() => import("@/pages/analytics/Analytics"));

//Manage
const ManagerManage = lazy(() => import("@/pages/manager/ManagerList"));
const ManagerNew = lazy(() => import("@/pages/manager/AddManager"));
const ManagerDashboard = lazy(() => import("@/pages/manager/Dashboard"));
const ManagerEditProfile = lazy(() => import("@/pages/manager/EditProfile"));



const ProfileViewer = lazy(() => import("@/pages/common/ProfileViewer"));

const PageNotFound = lazy(() => import("@/pages/NotFound"));

// Utils
const ForgetPassword = lazy(() => import("@/pages/auth/ForgetPassword"));
const ContactSupport = lazy(() => import("@/pages/support/Contact"));
const LearnMore = lazy(() => import("@/components/static/LearnMore"));

// loader
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600"></div>
    </div>
  );
}

// Sale
const SaleList = lazy(() => import("@/pages/sale/SaleList"));
const AddSale = lazy(() => import("@/pages/sale/AddSale"));

function App() {
  return (
    <>
      <Toaster position="top-center" />

      <Router>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public Routes */}
            <Route element={<PublicRoute />}>
              <Route path="/" element={<Home />} />
              <Route path="/owner/register" element={<OwnerRegistration />} />
              <Route path="/login" element={<Login />} />
              <Route path="/forgot-password" element={<ForgetPassword />} />
            </Route>

            {/* Protected Routes */}
            {/* Protected Routes - All Authenticated */}
            <Route element={<PrivateRoute />}>
              <Route path="/profile" element={<ProfileViewer />} />
              {/* Sale routes accessible to all authenticated users (including employees) */}
              <Route path="/sale/:sid" element={<SaleList />} />
              <Route path="/sale/:sid/new" element={<AddSale />} />
            </Route>

            {/* Owner Only */}
            <Route element={<PrivateRoute allowedRoles={["OWNER"]} />}>
              <Route path="/owner" element={<Owner />} />
              <Route path="/owner/edit" element={<OwnerEdit />} />
              <Route path="/business/edit/:bid" element={<BusinessEdit />} />
              <Route path="/business/new" element={<CreateBusiness />} />
              <Route path="/manager/manage" element={<ManagerManage />} />
              <Route path="/manager/new" element={<ManagerNew />} />
              <Route path="/manager/:id" element={<ProfileViewer />} />
            </Route>

            {/* Manager Only */}
            <Route element={<PrivateRoute allowedRoles={["MANAGER"]} />}>
              <Route path="/manager" element={<ManagerDashboard />} />
              <Route path="/manager/edit" element={<ManagerEditProfile />} />
            </Route>

            {/* Employee Only */}
            <Route element={<PrivateRoute allowedRoles={["EMPLOYEE"]} />}>
              <Route path="/employee" element={<Employee />} />
              <Route path="/employee/edit" element={<EmployeeSelfEdit />} />
            </Route>

            {/* Owner & Manager Common Routes */}
            {/* Owner & Manager Common Routes - Restricted */}
            <Route element={<PrivateRoute allowedRoles={["OWNER", "MANAGER"]} />}>
              <Route path="/analytics" element={<Analytics />} />

              {/* Employee Management */}
              <Route path="/employees/manage" element={<EmployeesManage />} />
              <Route path="/employee/new" element={<EmployeesNew />} />
              <Route path="/employee/:id" element={<ProfileViewer />} />
              <Route path="/employee/:id/edit" element={<EmployeeEdit />} />
            </Route>

            {/* Product - Accessible to Owner, Manager, and Employees with 'product' work */}
            <Route element={<PrivateRoute allowedRoles={["OWNER", "MANAGER", "EMPLOYEE"]} requiredWork="product" />}>
              <Route path="/product" element={<Product />} />
              <Route path="/product/add" element={<ProductAdd />} />
              <Route path="/product/:id/edit" element={<ProductEdit />} />
            </Route>

            {/* Inventory - Accessible to Owner, Manager, and Employees with 'inventory' work */}
            <Route element={<PrivateRoute allowedRoles={["OWNER", "MANAGER", "EMPLOYEE"]} requiredWork="inventory" />}>
              <Route path="/inventory" element={<Inventory />} />
              <Route path="/inventory/transaction/new" element={<InventoryTransactionCreate />} />
            </Route>

            {/* Cost Category - Accessible to Owner and Manager (and Employee if needed, assumed same as Product for now or own permission) */}
            <Route element={<PrivateRoute allowedRoles={["OWNER", "MANAGER"]} />}>
              <Route path="/cost-category" element={<CostCategoryList />} />
            </Route>

            {/* Invoice - Accessible to Owner, Manager, and Employees with 'invoice' work */}
            <Route element={<PrivateRoute allowedRoles={["OWNER", "MANAGER", "EMPLOYEE"]} requiredWork="invoice" />}>
              <Route path="/invoice/new" element={<InvoiceNew />} />
              <Route path="/invoice" element={<Invoice />} />
            </Route>

            <Route path="*" element={<PageNotFound />} />
          </Routes>
        </Suspense>
      </Router>
    </>
  );
}

export default App;
