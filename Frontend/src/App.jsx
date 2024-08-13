import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// Utils
import Header from "./Components/Utils/Header";
import Home from "./Components/Utils/Home";
import Footer from "./Components/Utils/Footer";
import PageNotFound from "./Components/Utils/PageNotFound";

//Owner
function App() {
  return (
    <>
      <Router>
        <Header />
        <Routes>
          {/* Home */}
          <Route path="/" element={<Home />} />

          {/* 404 Page Not Found */}
          <Route path="*" element={<PageNotFound />} />
        </Routes>
        <Footer />
      </Router>
    </>
  );
}

export default App;
