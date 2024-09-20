import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "axios";

function Sale() {
  let { sid } = useParams();
  const [saleData, setSaleData] = useState(null);

  useEffect(() => {
    async function getData() {
      let token = localStorage.getItem("token");

      try {
        const response = await axios.get(`/business/manage/sale/${sid}`, {
          headers: {
            Authorization: `${token}`,
          },
        });
        const data = response.data;
        console.log(data);
        setSaleData(data);
      } catch (error) {
        alert(error);
      }
    }
    getData();
  }, []);

  return (
    <>
      <Link
        to={`/sale/${sid}/new`}
        className="focus:outline-none text-white bg-purple-700 hover:bg-purple-800 focus:ring-4 focus:ring-purple-300 font-medium rounded-lg text-sm px-5 py-2.5 m-8 dark:bg-purple-600 dark:hover:bg-purple-700 dark:focus:ring-purple-900 mt-6"
      >
        New Sale Input
      </Link>
      {/* show all Sale Data */}
      {saleData ? <></> : <p>Loading</p>}
    </>
  );
}

export default Sale;
