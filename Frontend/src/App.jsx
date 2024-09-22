import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// Utils
import Home from "./Components/Utils/Home";
import PageNotFound from "./Components/Utils/PageNotFound";

//Owner
import OwnerRegistration from "./Components/Owner/OwnerRegistration";
import OwnerLogin from "./Components/Owner/OwnerLogin";
import Owner from "./Components/Owner/Owner";
import CreateBusiness from "./Components/Business/CreateBusiness";

// Sale
import Sale from "./Components/Management/Sale/Sale";
import NewSale from "./Components/Management/Sale/NewSale";

//Employee
import Employee from "./Components/Management/Employee/Employee";
import NewEmployee from "./Components/Management/Employee/NewEmployee";
import EditEmployee from "./Components/Management/Employee/EditEmployee";
import EmployeeLogin from "./Components/Management/Employee/EmployeeLogin";

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

//Owner
function App() {
  return (
    <>
      <Router>
        <Routes>
          <Route element={<PublicRoute />}></Route>
          {/* Home */}
          <Route path="/" element={<Home />} />
          {/* Owner */}
          <Route path="/owner/registration" element={<OwnerRegistration />} />
          <Route path="/owner/login" element={<OwnerLogin />} />
          <Route path="/owner/home" element={<Owner />} />
          {/* Business */}
          <Route path="/owner/business/new" element={<CreateBusiness />} />
          {/* Sale */}
          <Route path="/sale/:sid" element={<Sale />} />
          <Route path="/sale/:sid/new" element={<NewSale />} />

          {/* Employee */}
          <Route path="/employee/:eid" element={<Employee />} />
          <Route path="/employee/:eid/new" element={<NewEmployee />} />
          <Route path="/employee/:eid/:oeid/edit" element={<EditEmployee />} />
          <Route path="/employee/login/page" element={<EmployeeLogin />} />

          {/* Product */}
          <Route path="/product/:pid" element={<Product />} />
          <Route path="/product/:pid/new" element={<NewProduct />} />
          <Route path="/product/:pid/:opid/edit" element={<EditProduct />} />

          {/* inventory */}
          <Route path="/inventory/:iid" element={<Inventory />} />
          <Route path="/inventory/:iid/new" element={<NewInventory />} />

          <Route path="/analysis/:bid/" element={<Analysis />} />

          {/* 404 Page Not Found */}
          <Route path="*" element={<PageNotFound />} />
        </Routes>
      </Router>
    </>
  );
}

export default App;
