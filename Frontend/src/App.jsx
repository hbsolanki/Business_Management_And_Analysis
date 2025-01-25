import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// Utils
import Home from "./Components/Utils/Home/Home";
import PageNotFound from "./Components/Utils/PageNotFound";

//Owner
import OwnerRegistration from "./Components/Owner/OwnerRegistration";
import OwnerLogin from "./Components/Owner/OwnerLogin";
import Owner from "./Components/Owner/Owner";
import CreateBusiness from "./Components/Business/CreateBusiness";
import EditBusiness from "./Components/Business/EditBusiness";
import OwnerEdit from "./Components/Owner/OwnerEdit";

// Sale
import Sale from "./Components/Management/Sale/Sale";
import NewSale from "./Components/Management/Sale/NewSale";

//Employee
import Employee from "./Components/Management/Employee/Employee";
import NewEmployee from "./Components/Management/Employee/NewEmployee";
import EditEmployee from "./Components/Management/Employee/EditEmployee";
import EmployeeLogin from "./Components/Management/Employee/EmployeeLogin";
import EmployeeDashboard from "./Components/Management/Employee/EmployeeDashboard";

//Product
import Product from "./Components/Management/Product/Product";
import NewProduct from "./Components/Management/Product/NewProduct";
import EditProduct from "./Components/Management/Product/EditProduct";

//Inventary
import Inventory from "./Components/Management/Inventory/Inventory";
import NewInventory from "./Components/Management/Inventory/NewInventory";

// Analysis
import Analysis from "./Components/Analysis/pages/Analysis";

// Public Private Route
import PublicRoute from "./Components/Auth/PublicRoute";
import PrivateRoute from "./Components/Auth/PrivateRoute";
import OwnerRoute from "./Components/Auth/OwnerRoute";
import EmployeeRoutes from "./Components/Auth/EmployeeRoutes";
import SelfEditEmployee from "./Components/Management/Employee/SelfEditEmployee";

import { Toaster } from "react-hot-toast";

function App() {
  return (
    <>
      <Toaster position="top-center" />
      <Router>
        <Routes>
          <Route element={<PublicRoute />}>
            {/* Home */}
            <Route path="/" element={<Home />} />
            {/* Owner */}
            <Route path="/owner/registration" element={<OwnerRegistration />} />
            <Route path="/owner/login" element={<OwnerLogin />} />
            <Route path="/employee/login/page" element={<EmployeeLogin />} />
          </Route>
          <Route element={<PrivateRoute />}>
            <Route element={<OwnerRoute />}>
              <Route path="/owner/home" element={<Owner />} />
              <Route path="/owner/edit" element={<OwnerEdit />} />
              {/* Business */}
              <Route path="/owner/business/new" element={<CreateBusiness />} />
              <Route
                path="/owner/business/edit/:bid"
                element={<EditBusiness />}
              />
              <Route path="/analysis/:bid/" element={<Analysis />} />
            </Route>

            {/* Sale */}
            <Route path="/sale/:sid" element={<Sale />} />
            <Route path="/sale/:sid/new" element={<NewSale />} />

            {/* Employee */}
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

            {/* Product */}
            <Route path="/product/:pid" element={<Product />} />
            <Route path="/product/:pid/new" element={<NewProduct />} />
            <Route path="/product/:pid/:opid/edit" element={<EditProduct />} />

            {/* inventory */}
            <Route path="/inventory/:iid" element={<Inventory />} />
            <Route path="/inventory/:iid/new" element={<NewInventory />} />
          </Route>

          {/* 404 Page Not Found */}
          <Route path="*" element={<PageNotFound />} />
        </Routes>
      </Router>
    </>
  );
}

export default App;
