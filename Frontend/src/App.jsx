import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// Utils
import Home from "./Components/Utils/Home/Home";
import PageNotFound from "./Components/Utils/PageNotFound";
import ForgotPassword from "./Components/Utils/ForgetPassword";

// Owner
import OwnerRegistration from "./Components/Owner/OwnerRegistration";
import OwnerLogin from "./Components/Owner/OwnerLogin";
import Owner from "./Components/Owner/Owner";
import CreateBusiness from "./Components/Business/CreateBusiness";
import EditBusiness from "./Components/Business/EditBusiness";
import OwnerEdit from "./Components/Owner/OwnerEdit";

// Sale
import Sale from "./Components/Management/Sale/Sale";
import NewSale from "./Components/Management/Sale/NewSale";

// Employee
import Employee from "./Components/Management/Employee/Employee";
import NewEmployee from "./Components/Management/Employee/NewEmployee";
import EditEmployee from "./Components/Management/Employee/EditEmployee";
import EmployeeLogin from "./Components/Management/Employee/EmployeeLogin";
import EmployeeDashboard from "./Components/Management/Employee/EmployeeDashboard";
import SelfEditEmployee from "./Components/Management/Employee/SelfEditEmployee";

// Product
import Product from "./Components/Management/Product/Product";
import NewProduct from "./Components/Management/Product/NewProduct";
import EditProduct from "./Components/Management/Product/EditProduct";

// Inventory
import Inventory from "./Components/Management/Inventory/Inventory";
import NewInventory from "./Components/Management/Inventory/NewInventory";

// Analysis
import Analysis from "./Components/Analysis/pages/Analysis";

// Public & Private Routes
import PublicRoute from "./Components/Auth/PublicRoute";
import PrivateRoute from "./Components/Auth/PrivateRoute";
import OwnerRoute from "./Components/Auth/OwnerRoute";
import EmployeeRoutes from "./Components/Auth/EmployeeRoutes";

//charts
import Netprofit_Last_Months from "./Components/Analysis/pages/charts_info/Netprofit_Last_Months";
import ProductInventoryLastmMonth from "./Components/Analysis/pages/charts_info/ProductInventoryLastmMonth";
import ProductSoldLastMonth from "./Components/Analysis/pages/charts_info/ProductSoldLastMonth";
import ProductStats from "./Components/Analysis/pages/charts_info/ProductStats";
import ProductStock from "./Components/Analysis/pages/charts_info/ProductStock";
import Turnover from "./Components/Analysis/pages/charts_info/Turnover";
import TurnoverLastMonths from "./Components/Analysis/pages/charts_info/TurnoverLastMonths";

import { Toaster } from "react-hot-toast";
import TokenExpiryWatcher from "./TokenExpiryWatcher";

function App() {
  return (
    <>
      <Toaster position="top-center" />
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route element={<PublicRoute />}>
            <Route path="/" element={<Home />} />
            <Route path="/owner/registration" element={<OwnerRegistration />} />
            <Route path="/owner/login" element={<OwnerLogin />} />
            <Route path="/employee/login" element={<EmployeeLogin />} />
            <Route path="/owner/forgot-password" element={<ForgotPassword />} />
            <Route
              path="/employee/forgot-password"
              element={<ForgotPassword />}
            />
          </Route>

          {/* Private Routes */}
          <Route
            element={
              <>
                <TokenExpiryWatcher />{" "}
                {/* Token check only for authenticated users */}
                <PrivateRoute />
              </>
            }
          >
            {/* Owner Routes */}
            <Route element={<OwnerRoute />}>
              <Route path="/owner/home" element={<Owner />} />
              <Route path="/owner/edit" element={<OwnerEdit />} />
              <Route path="/owner/business/new" element={<CreateBusiness />} />
              <Route
                path="/owner/business/edit/:bid"
                element={<EditBusiness />}
              />
              <Route path="/analysis/:bid/" element={<Analysis />} />
              <Route path="/analysis/:bid/turnover" element={<Turnover />} />
              <Route
                path="/analysis/:bid/turnover_last_months"
                element={<TurnoverLastMonths />}
              />
              <Route
                path="/analysis/:bid/netprofit_last_months"
                element={<Netprofit_Last_Months />}
              />
              <Route
                path="/analysis/:bid/product_stats"
                element={<ProductStats />}
              />
              <Route
                path="/analysis/:bid/product_inventory_last_month"
                element={<ProductInventoryLastmMonth />}
              />
              <Route
                path="/analysis/:bid/product_sold_last_month"
                element={<ProductSoldLastMonth />}
              />
              <Route
                path="/analysis/:bid/product_stock"
                element={<ProductStock />}
              />
            </Route>

            {/* Sales */}
            <Route path="/sale/:sid" element={<Sale />} />
            <Route path="/sale/:sid/new" element={<NewSale />} />

            {/* Employee Management */}
            <Route
              path="/employee/dashboard/:eid"
              element={<EmployeeDashboard />}
            />
            <Route path="/employee/:eid" element={<Employee />} />
            <Route path="/employee/:eid/new" element={<NewEmployee />} />
            <Route
              path="/employee/:eid/:oeid/edit"
              element={<EditEmployee />}
            />
            <Route path="/employee/:oeid/edit" element={<SelfEditEmployee />} />

            {/* Products */}
            <Route path="/product/:pid" element={<Product />} />
            <Route path="/product/:pid/new" element={<NewProduct />} />
            <Route path="/product/:pid/:opid/edit" element={<EditProduct />} />

            {/* Inventory */}
            <Route path="/inventory/:iid" element={<Inventory />} />
            <Route path="/inventory/:iid/new" element={<NewInventory />} />
          </Route>

          {/* Catch-All Route for 404 Page */}
          <Route path="*" element={<PageNotFound />} />
        </Routes>
      </Router>
    </>
  );
}

export default App;
