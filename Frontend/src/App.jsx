import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// Utils
import Header from "./Components/Utils/Header";
import Home from "./Components/Utils/Home";
import Footer from "./Components/Utils/Footer";
import PageNotFound from "./Components/Utils/PageNotFound";

//Owner
import OwnerRegistration from "./Components/Owner/OwnerRegistration";
import OwnerLogin from "./Components/Owner/OwnerLogin";

//Owner
function App() {
  return (
    <>
      <Router>
        {/* <Header /> */}
        <Routes>
          {/* Home */}
          <Route path="/" element={<Home />} />

          {/* Owner */}
          <Route path="/owner/registration" element={<OwnerRegistration />} />
          <Route path="/owner/login" element={<OwnerLogin />} />

          {/* 404 Page Not Found */}
          <Route path="*" element={<PageNotFound />} />
        </Routes>
        <Footer />
      </Router>
    </>
  );
}

export default App;
