import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { lazy, Suspense } from "react";
import { Toaster } from "react-hot-toast";

import PublicRoute from "@/features/auth/routes/PublicRoute";
import PrivateRoute from "@/features/auth/routes/PrivateRoute";

// lazy imports
const Home = lazy(() => import("@/pages/Home"));
const Subscriptions = lazy(() => import("@/pages/subscription/Subscriptions"));
const OwnerRegistration = lazy(() => import("@/pages/auth/OwnerRegister"));
const Login = lazy(() => import("@/pages/auth/Login"));
const Owner = lazy(() => import("@/pages/owner/Dashboard"));
const OwnerEdit = lazy(() => import("@/pages/owner/EditProfile"));
const Product = lazy(() => import("@/pages/product/ProductList"));
const ProductAdd = lazy(() => import("@/pages/product/AddProduct"));
const ProductEdit = lazy(() => import("@/pages/product/EditProduct"));
const CreateBusiness = lazy(() => import("@/pages/business/CreateBusiness"));

// inventory
const Inventory = lazy(() => import("@/pages/inventory/InventoryList"));
const InventoryTransactionCreate = lazy(
  () => import("@/pages/inventory/AddTransaction"),
);

const BusinessEdit = lazy(() => import("@/pages/business/EditBusiness"));
const ComplianceSettings = lazy(() => import("@/pages/business/ComplianceSettings"));
const BranchList = lazy(() => import("@/pages/business/BranchList"));
const AddBranch = lazy(() => import("@/pages/business/AddBranch"));
const EditBranch = lazy(() => import("@/pages/business/EditBranch"));

// invoice
const InvoiceNew = lazy(() => import("@/pages/invoice/AddInvoice"));
const Invoice = lazy(() => import("@/pages/invoice/InvoiceList"));
const PaymentSuccess = lazy(() => import("@/pages/invoice/PaymentSuccess"));

// Cost Category & Management
const CostDashboard = lazy(() => import("@/pages/cost/CostDashboard"));
const AddCost = lazy(() => import("@/pages/cost/AddCost"));
const SupplierDashboard = lazy(
  () => import("@/pages/supplier/SupplierDashboard"),
);
const VendorList = lazy(() => import("@/pages/supplier/VendorList"));
const CustomerList = lazy(() => import("@/pages/supplier/CustomerList"));
const PurchaseOrderList = lazy(
  () => import("@/pages/supplier/PurchaseOrderList"),
);
const SaleOrderList = lazy(() => import("@/pages/supplier/SaleOrderList"));
const AddVendor = lazy(() => import("@/pages/supplier/AddVendor"));
const AddCustomer = lazy(() => import("@/pages/supplier/AddCustomer"));
const AddPurchaseOrder = lazy(
  () => import("@/pages/supplier/AddPurchaseOrder"),
);
const AddSaleOrder = lazy(() => import("@/pages/supplier/AddSaleOrder"));
const EditPurchaseOrder = lazy(
  () => import("@/pages/supplier/EditPurchaseOrder"),
);
const EditSaleOrder = lazy(() => import("@/pages/supplier/EditSaleOrder"));
const ViewPurchaseOrder = lazy(
  () => import("@/pages/supplier/ViewPurchaseOrder"),
);
const ViewSaleOrder = lazy(() => import("@/pages/supplier/ViewSaleOrder"));
const ViewVendor = lazy(() => import("@/pages/supplier/ViewVendor"));
const ViewCustomer = lazy(() => import("@/pages/supplier/ViewCustomer"));

// employee
const EmployeesManage = lazy(() => import("@/pages/employee/EmployeeList"));
const EmployeesNew = lazy(() => import("@/pages/employee/AddEmployee"));
const EmployeeEdit = lazy(() => import("@/pages/employee/EditEmployee"));
const EmployeeSelfEdit = lazy(() => import("@/pages/employee/EditProfile"));
const Employee = lazy(() => import("@/pages/employee/Dashboard"));

//Analysis
const AnalyticsIndex = lazy(() => import("@/pages/analytics/AnalyticsIndex"));
const AnalyticsEndpointView = lazy(
  () => import("@/pages/analytics/AnalyticsEndpointView"),
);
const AnalyticsReportGenerator = lazy(
  () => import("@/pages/analytics/AnalyticsReportGenerator"),
);
const GstSummary = lazy(() => import("@/pages/analytics/GstSummaryDashboard"));

//Manage
const ManagerManage = lazy(() => import("@/pages/manager/ManagerList"));
const ManagerNew = lazy(() => import("@/pages/manager/AddManager"));
const ManagerDashboard = lazy(() => import("@/pages/manager/Dashboard"));
const ManagerEditProfile = lazy(() => import("@/pages/manager/EditProfile"));
const EditManager = lazy(() => import("@/pages/manager/EditManager"));

const ProfileViewer = lazy(() => import("@/pages/common/ProfileViewer"));

const PageNotFound = lazy(() => import("@/pages/NotFound"));
const ActivityLogs = lazy(() => import("@/pages/common/ActivityLogs"));

// Utils
const ForgetPassword = lazy(() => import("@/pages/auth/ForgetPassword"));
const ForgotUsername = lazy(() => import("@/pages/auth/ForgotUsername"));

// Info Feature
const InfoLayout = lazy(() => import("@/features/info/components/InfoLayout"));
const InfoLanding = lazy(() => import("@/pages/info/InfoLanding"));
const ModulesDirectory = lazy(() => import("@/pages/info/ModulesDirectory"));
const ModuleGuide = lazy(() => import("@/pages/info/ModuleGuide"));
const OwnerInfo = lazy(() => import("@/pages/info/OwnerInfo"));
const ManagerInfo = lazy(() => import("@/pages/info/ManagerInfo"));
const EmployeeInfo = lazy(() => import("@/pages/info/EmployeeInfo"));
const Support = lazy(() => import("@/pages/info/Support"));

const ExpenseList = lazy(() => import("@/pages/cost/ExpenseList"));
const AddExpense = lazy(() => import("@/pages/cost/AddExpense"));

// loader
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-transparent">
      <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-brand-600"></div>
    </div>
  );
}

// Sale
const SaleList = lazy(() => import("@/pages/sale/SaleList"));
const AddSale = lazy(() => import("@/pages/sale/AddSale"));

// Chat
const Chat = lazy(() => import("@/pages/chat/Chat"));
const Broadcast = lazy(() => import("@/pages/chat/Broadcast"));
const NewBroadcast = lazy(() => import("@/pages/chat/NewBroadcast"));
const AiAgent = lazy(() => import("@/pages/chat/ai-agent/AiAgent"));

// Task Management
const TaskDashboard = lazy(() => import("@/pages/task/TaskDashboard"));
const TaskDetails = lazy(() => import("@/pages/task/TaskDetails"));
const EditTask = lazy(() => import("@/pages/task/EditTask"));
const CreateTask = lazy(() => import("@/pages/task/CreateTask"));

import { useSelector, useDispatch } from "react-redux";
import { useEffect } from "react";
import { NotificationProvider } from "@/context/NotificationContext";
import { authService } from "@/services/authService";
import { setUserProfile } from "@/redux/slices/userSlice";
import { tokenService } from "@/services/tokenService";

function App() {
  const theme = useSelector((state) => state.theme.mode);
  const dispatch = useDispatch();

  useEffect(() => {
    const initAuth = async () => {
      const token = tokenService.getAccessToken();
      if (token) {
        try {
          const profile = await authService.getMe();
          dispatch(setUserProfile(profile));
        } catch (error) {
          console.error("Auth init failed", error);
        }
      }
    };
    initAuth();
  }, [dispatch]);

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  return (
    <>
      <Toaster
        position="top-center"
        toastOptions={{
          className: "dark:bg-gray-800 dark:text-white",
          style: {
            background: theme === "dark" ? "#1f2937" : "#fff",
            color: theme === "dark" ? "#fff" : "#1f2937",
          },
        }}
      />

      <Router>
        <NotificationProvider>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public Routes */}
              <Route element={<PublicRoute />}>
                <Route path="/" element={<Home />} />
                <Route path="/owner/register" element={<OwnerRegistration />} />
                <Route path="/login" element={<Login />} />
                <Route path="/forgot-password" element={<ForgetPassword />} />
                <Route path="/forgot-username" element={<ForgotUsername />} />
              </Route>

              <Route element={<PrivateRoute />}>
                <Route path="/profile" element={<ProfileViewer />} />
                <Route path="/profile/:id" element={<ProfileViewer />} />
                <Route path="/user/:id" element={<ProfileViewer />} />
                <Route path="/sale/:sid" element={<SaleList />} />
                <Route path="/sale/:sid/new" element={<AddSale />} />
                <Route path="/business/new" element={<CreateBusiness />} />
              </Route>

              <Route path="/info" element={<InfoLayout />}>
                <Route index element={<InfoLanding />} />
                <Route path="modules" element={<ModulesDirectory />} />
                <Route path="modules/:moduleId" element={<ModuleGuide />} />
                <Route element={<PrivateRoute allowedRoles={["OWNER"]} />}>
                  <Route path="owner" element={<OwnerInfo />} />
                </Route>
                <Route
                  element={<PrivateRoute allowedRoles={["OWNER", "MANAGER"]} />}
                >
                  <Route path="manager" element={<ManagerInfo />} />
                </Route>
                <Route
                  element={
                    <PrivateRoute
                      allowedRoles={["OWNER", "MANAGER", "EMPLOYEE"]}
                    />
                  }
                >
                  <Route path="employee" element={<EmployeeInfo />} />
                </Route>
                <Route path="support" element={<Support />} />
              </Route>

              {/* Owner Only */}
              <Route element={<PrivateRoute allowedRoles={["OWNER"]} />}>
                <Route path="/owner" element={<Owner />} />
                <Route path="/owner/edit" element={<OwnerEdit />} />
                <Route path="/business/edit/:bid" element={<BusinessEdit />} />
                <Route path="/business/compliance" element={<ComplianceSettings />} />
                <Route
                  element={<PrivateRoute allowedRoles={["OWNER", "MANAGER"]} />}
                >
                  <Route path="/business/branch" element={<BranchList />} />
                  <Route path="/business/branch/new" element={<AddBranch />} />
                  <Route
                    path="/business/branch/:id/edit"
                    element={<EditBranch />}
                  />
                </Route>
                <Route path="/manager/manage" element={<ManagerManage />} />
                <Route path="/manager/new" element={<ManagerNew />} />
                <Route path="/manager/:id" element={<ProfileViewer />} />
                <Route path="/manager/:id/edit" element={<EditManager />} />
              </Route>

              {/* Manager Only */}
              <Route element={<PrivateRoute allowedRoles={["MANAGER"]} />}>
                <Route path="/manager" element={<ManagerDashboard />} />
                <Route path="/manager/edit" element={<ManagerEditProfile />} />
              </Route>

              {/* Owner & Manager Shared */}
              <Route
                element={<PrivateRoute allowedRoles={["OWNER", "MANAGER"]} />}
              >
                <Route path="/subscriptions" element={<Subscriptions />} />
                <Route path="/activity-logs" element={<ActivityLogs />} />
              </Route>

              {/* Employee Only */}
              <Route element={<PrivateRoute allowedRoles={["EMPLOYEE"]} />}>
                <Route path="/employee" element={<Employee />} />
                <Route path="/employee/edit" element={<EmployeeSelfEdit />} />
              </Route>

              <Route
                element={
                  <PrivateRoute
                    allowedRoles={["OWNER", "MANAGER", "EMPLOYEE"]}
                    requiredWork="analytics"
                  />
                }
              >
                <Route path="/analytics" element={<AnalyticsIndex />} />
                <Route
                  path="/analytics/report"
                  element={<AnalyticsReportGenerator />}
                />
                <Route
                  path="/analytics/view/:apiId"
                  element={<AnalyticsEndpointView />}
                />
                <Route
                  path="/analytics/overview"
                  element={
                    <AnalyticsEndpointView defaultApiId="month-breakdown" />
                  }
                />
                <Route
                  path="/analytics/visual"
                  element={
                    <AnalyticsEndpointView defaultApiId="product-performance" />
                  }
                />
                <Route
                  path="/analytics/customers"
                  element={
                    <AnalyticsEndpointView defaultApiId="customer-revenue" />
                  }
                />

                <Route path="/analytics/gst" element={<GstSummary />} />

                <Route path="/employees/manage" element={<EmployeesManage />} />
                <Route path="/employee/new" element={<EmployeesNew />} />
                <Route path="/employee/:id" element={<ProfileViewer />} />
                <Route path="/employee/:id/edit" element={<EmployeeEdit />} />
              </Route>

              <Route
                element={
                  <PrivateRoute
                    allowedRoles={["OWNER", "MANAGER", "EMPLOYEE"]}
                    requiredWork="product"
                  />
                }
              >
                <Route path="/product" element={<Product />} />
                <Route path="/product/add" element={<ProductAdd />} />
                <Route path="/product/:id/edit" element={<ProductEdit />} />
              </Route>

              <Route
                element={
                  <PrivateRoute
                    allowedRoles={["OWNER", "MANAGER", "EMPLOYEE"]}
                    requiredWork="inventory"
                  />
                }
              >
                <Route path="/inventory" element={<Inventory />} />
                <Route
                  path="/inventory/transaction/new"
                  element={<InventoryTransactionCreate />}
                />
              </Route>

              <Route
                element={
                  <PrivateRoute
                    allowedRoles={["OWNER", "MANAGER", "EMPLOYEE"]}
                    requiredWork="supplier"
                  />
                }
              >
                <Route path="/supplier" element={<SupplierDashboard />} />
                <Route path="/supplier/vendor" element={<VendorList />} />
                <Route path="/supplier/customer" element={<CustomerList />} />
                <Route
                  path="/supplier/purchase-order"
                  element={<PurchaseOrderList />}
                />
                <Route
                  path="/supplier/purchase-order/new"
                  element={<AddPurchaseOrder />}
                />
                <Route
                  path="/supplier/purchase-order/:id"
                  element={<ViewPurchaseOrder />}
                />
                <Route
                  path="/supplier/purchase-order/:id/edit"
                  element={<EditPurchaseOrder />}
                />
                <Route
                  path="/supplier/sales-order"
                  element={<SaleOrderList />}
                />
                <Route
                  path="/supplier/sales-order/new"
                  element={<AddSaleOrder />}
                />
                <Route
                  path="/supplier/sales-order/:id"
                  element={<ViewSaleOrder />}
                />
                <Route
                  path="/supplier/sales-order/:id/edit"
                  element={<EditSaleOrder />}
                />
                <Route path="/supplier/vendor/new" element={<AddVendor />} />
                <Route path="/supplier/vendor/:id" element={<ViewVendor />} />
                <Route
                  path="/supplier/vendor/:id/edit"
                  element={<AddVendor />}
                />
                <Route
                  path="/supplier/customer/new"
                  element={<AddCustomer />}
                />
                <Route
                  path="/supplier/customer/:id"
                  element={<ViewCustomer />}
                />
                <Route
                  path="/supplier/customer/:id/edit"
                  element={<AddCustomer />}
                />
                <Route path="/customer/new" element={<AddCustomer />} />
                <Route path="/customer/:id" element={<ViewCustomer />} />
                <Route path="/customer/:id/edit" element={<AddCustomer />} />
              </Route>

              <Route
                element={<PrivateRoute allowedRoles={["OWNER", "MANAGER"]} />}
              >
                <Route path="/cost-category" element={<CostDashboard />} />
                <Route path="/cost-category/month" element={<AddCost />} />
                <Route path="/cost/expenses" element={<ExpenseList />} />
                <Route path="/cost/expenses/add" element={<AddExpense />} />
                <Route
                  path="/cost"
                  element={<Navigate to="/cost-category" replace />}
                />
              </Route>

              <Route
                element={
                  <PrivateRoute
                    allowedRoles={["OWNER", "MANAGER", "EMPLOYEE"]}
                    requiredWork="invoice"
                  />
                }
              >
                <Route path="/invoice/new" element={<InvoiceNew />} />
                <Route path="/invoice" element={<Invoice />} />
                <Route path="/payment-success" element={<PaymentSuccess />} />
              </Route>

              <Route
                element={
                  <PrivateRoute
                    allowedRoles={["OWNER", "MANAGER", "EMPLOYEE"]}
                  />
                }
              >
                <Route path="/chat" element={<Chat />} />
                <Route path="/chat/:otherUserId" element={<Chat />} />
              </Route>

              <Route
                element={<PrivateRoute allowedRoles={["OWNER", "MANAGER"]} />}
              >
                <Route path="/chat/broadcast" element={<Broadcast />} />
                <Route path="/chat/broadcast/new" element={<NewBroadcast />} />
                <Route
                  path="/chat/broadcast/:id/edit"
                  element={<NewBroadcast />}
                />
                <Route path="/ai-agent/session" element={<AiAgent />} />
                <Route
                  path="/ai-agent/session/:sessionId"
                  element={<AiAgent />}
                />
              </Route>

              <Route
                element={
                  <PrivateRoute
                    allowedRoles={["OWNER", "MANAGER", "EMPLOYEE"]}
                  />
                }
              >
                <Route path="/tasks" element={<TaskDashboard />} />
                <Route path="/tasks/created" element={<TaskDashboard />} />
                <Route path="/tasks/my-tasks" element={<TaskDashboard />} />
                <Route path="/tasks/new" element={<CreateTask />} />
                <Route path="/tasks/:id" element={<TaskDetails />} />
                <Route path="/tasks/:id/edit" element={<EditTask />} />
              </Route>

              <Route path="*" element={<PageNotFound />} />
            </Routes>
          </Suspense>
        </NotificationProvider>
      </Router>
    </>
  );
}

export default App;
