import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";

function BusinessCard({ id }) {
  const [businessData, setBusinessData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function getData() {
      let token = localStorage.getItem("token");

      try {
        const response = await axios.get(`/API/owner/business/data/${id}/`, {
          headers: {
            Authorization: `${token}`,
          },
        });
        const data = response.data;
        console.log(data);

        setBusinessData(data);
      } catch (error) {
        alert(error);
      }
    }
    getData();
  }, []);

  return (
    <>
      {businessData ? (
        <div className="business-card-container">
          <div className="business-card">
            <h2 className="business-name">{businessData.name}</h2>
            <p className="business-description">{businessData.description}</p>
            <div className="business-info">
              <p>
                <strong>Assets:</strong> {businessData.assets}
              </p>
              <p>
                <strong>Profit:</strong> {businessData.profit}
              </p>
            </div>
            <br />
            <div className="management-links">
              <h3>Manage Your Business</h3>
              <ul>
                <li>
                  <Link to={`/employee/${businessData.employee}`}>
                    Employee Management
                  </Link>
                </li>
                <li>
                  <Link to={`/product/${businessData.product}`}>
                    Product Management
                  </Link>
                </li>
                <li>
                  <Link to={`/inventory/${businessData.inventory}`}>
                    Inventory Management
                  </Link>
                </li>
                <li>
                  <Link to={`/sale/${businessData.sale}`}>Sale Management</Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      ) : (
        <p>Loading...</p>
      )}
    </>
  );
}

export default BusinessCard;
