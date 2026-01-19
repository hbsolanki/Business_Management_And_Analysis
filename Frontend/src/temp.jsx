import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import { lazy, Suspense } from "react";

const Home = lazy(() => import("./Components/Utils/Home/Home"))
const OwnerRegistration = lazy(() => import("./Components/Owner/OwnerRegistration"))
const Login = lazy(() => import("./Components/Auth/Login.jsx"))
const Owner = lazy(() => import("./Components/Owner/Owner"))

const PageNotFound = lazy(() => import("./Components/Utils/PageNotFound"))
// Utils
import ForgotPassword from "./Components/Utils/ForgetPassword";

// Owner
// import OwnerRegistration from "./Components/Owner/OwnerRegistration";
import OwnerLogin from "./Components/Owner/OwnerLogin";
// import Owner from "./Components/Owner/Owner";
import CreateBusiness from "./Components/Business/CreateBusiness";
import EditBusiness from "./Components/Business/EditBusiness";
import OwnerEdit from "./Components/Owner/OwnerEdit";

// Sale
import Sale from "./Components/Management/Sale/Sale";
import NewSale from "./Components/Management/Sale/NewSale";

// EmployeeManage
import EmployeeManage from "./Components/Management/Employee/EmployeeManage.jsx";
import EmployeeNew from "./Components/Management/Employee/EmployeeNew.jsx";
import EditEmployee from "./Components/Management/Employee/EditEmployee";
import EmployeeLogin from "./Components/Management/Employee/EmployeeLogin";
import EmployeeDashboard from "./Components/Management/Employee/EmployeeDashboard";
import SelfEditEmployee from "./Components/Management/Employee/EmployeeEdit.jsx";

// ProductPage
import ProductPage from "./Components/Management/Product/ProductPage.jsx";
import NewProduct from "./Components/Management/Product/NewProduct";
import EditProduct from "./Components/Management/Product/ProductEditPage.jsx";

// InventoryPage
import InventoryPage from "./Components/Management/Inventory/InventoryPage.jsx";
import InventoryTransactionCreate from "./Components/Management/Inventory/InventoryTransactionCreate.jsx";

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
import LearnMoreBasic from "./Components/Utils/LearnMoreBasic";

//Auth

function App() {
  return (
    <>
      <Toaster position="top-center" />
      <Router>
          <Suspense fallback={<div>Loading...</div>}>
        <Routes>
          <Route path={"/"} element={<Home/>}/>
            <Route path={"/owner/register"} element={<OwnerRegistration/>}/>
            <Route path={"/login"} element={<Login/>}/>
            <Route path={'/owner'} element={<Owner/>}/>
          {/* Public Routes */}
          {/*<Route element={<PublicRoute />}>*/}
          {/*  <Route path="/" element={<Home />} />*/}
          {/*  /!* <Route path="/learn-more" element={<LearnMoreBasic />} /> *!/*/}
          {/*  <Route path="/owner/registration" element={<OwnerRegistration />} />*/}
          {/*  <Route path="/owner/login" element={<OwnerLogin />} />*/}
          {/*  <Route path="/employee/login" element={<EmployeeLogin />} />*/}
          {/*  <Route path="/owner/forgot-password" element={<ForgotPassword />} />*/}
          {/*  <Route*/}
          {/*    path="/employee/forgot-password"*/}
          {/*    element={<ForgotPassword />}*/}
          {/*  />*/}
          {/*</Route>*/}

          {/*/!* Private Routes *!/*/}
          {/*<Route*/}
          {/*  element={*/}
          {/*    <>*/}
          {/*      <TokenExpiryWatcher />{" "}*/}
          {/*      /!* Token check only for authenticated users *!/*/}
          {/*      <PrivateRoute />*/}
          {/*    </>*/}
          {/*  }*/}
          {/*>*/}
          {/*  /!* Owner Routes *!/*/}
          {/*  <Route element={<OwnerRoute />}>*/}
          {/*    <Route path="/owner/home" element={<Owner />} />*/}
          {/*    <Route path="/owner/edit" element={<OwnerEdit />} />*/}
          {/*    <Route path="/owner/business/new" element={<CreateBusiness />} />*/}
          {/*    <Route*/}
          {/*      path="/owner/business/edit/:bid"*/}
          {/*      element={<EditBusiness />}*/}
          {/*    />*/}
          {/*    <Route path="/analysis/:bid/" element={<Analysis />} />*/}
          {/*    <Route path="/analysis/:bid/turnover" element={<Turnover />} />*/}
          {/*    <Route*/}
          {/*      path="/analysis/:bid/turnover_last_months"*/}
          {/*      element={<TurnoverLastMonths />}*/}
          {/*    />*/}
          {/*    <Route*/}
          {/*      path="/analysis/:bid/netprofit_last_months"*/}
          {/*      element={<Netprofit_Last_Months />}*/}
          {/*    />*/}
          {/*    <Route*/}
          {/*      path="/analysis/:bid/product_stats"*/}
          {/*      element={<ProductStats />}*/}
          {/*    />*/}
          {/*    <Route*/}
          {/*      path="/analysis/:bid/product_inventory_last_month"*/}
          {/*      element={<ProductInventoryLastmMonth />}*/}
          {/*    />*/}
          {/*    <Route*/}
          {/*      path="/analysis/:bid/product_sold_last_month"*/}
          {/*      element={<ProductSoldLastMonth />}*/}
          {/*    />*/}
          {/*    <Route*/}
          {/*      path="/analysis/:bid/product_stock"*/}
          {/*      element={<ProductStock />}*/}
          {/*    />*/}
          {/*  </Route>*/}

          {/*  /!* Sales *!/*/}
          {/*  <Route path="/sale/:sid" element={<Sale />} />*/}
          {/*  <Route path="/sale/:sid/new" element={<NewSale />} />*/}

          {/*  /!* EmployeeManage Management *!/*/}
          {/*  <Route*/}
          {/*    path="/employee/dashboard/:eid"*/}
          {/*    element={<EmployeeDashboard />}*/}
          {/*  />*/}
          {/*  <Route path="/employee/:eid" element={<EmployeeManage />} />*/}
          {/*  <Route path="/employee/:eid/new" element={<EmployeeNew />} />*/}
          {/*  <Route*/}
          {/*    path="/employee/:eid/:oeid/edit"*/}
          {/*    element={<EditEmployee />}*/}
          {/*  />*/}
          {/*  <Route path="/employee/:oeid/edit" element={<SelfEditEmployee />} />*/}

          {/*  /!* Products *!/*/}
          {/*  <Route path="/product/:pid" element={<ProductPage />} />*/}
          {/*  <Route path="/product/:pid/new" element={<NewProduct />} />*/}
          {/*  <Route path="/product/:pid/:opid/edit" element={<EditProduct />} />*/}

          {/*  /!* InventoryPage *!/*/}
          {/*  <Route path="/inventory/:iid" element={<InventoryPage />} />*/}
          {/*  <Route path="/inventory/:iid/new" element={<InventoryTransactionCreate />} />*/}
          {/*</Route>*/}

          {/* Catch-All Route for 404 Page */}
          <Route path="*" element={<PageNotFound />} />
        </Routes>
              </Suspense>
      </Router>
    </>
  );
}

export default App;
