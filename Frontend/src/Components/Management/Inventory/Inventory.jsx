import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "axios";

function Inventary() {
  let { iid } = useParams();
  const [inventaryData, setInventaryData] = useState(null);

  useEffect(() => {
    async function getData() {
      let token = localStorage.getItem("token");

      try {
        const response = await axios.get(`/API/inventory/${iid}/`, {
          headers: {
            Authorization: `${token}`,
          },
        });
        const data = response.data;
        console.log(data);
        setInventaryData(data);
      } catch (error) {
        console.log(error);
      }
    }
    getData();
  }, []);

  return (
    <>
      <Link
        to={`/inventory/${iid}/new`}
        className="focus:outline-none text-white bg-purple-700 hover:bg-purple-800 focus:ring-4 focus:ring-purple-300 font-medium rounded-lg text-sm px-5 py-2.5 m-8 dark:bg-purple-600 dark:hover:bg-purple-700 dark:focus:ring-purple-900 mt-6"
      >
        New Inventary
      </Link>
      {/* show all Sale Data */}
      {inventaryData ? (
        inventaryData["stock"].map((product) => {})
      ) : (
        <p>Loading</p>
      )}
    </>
  );
}

export default Inventary;
