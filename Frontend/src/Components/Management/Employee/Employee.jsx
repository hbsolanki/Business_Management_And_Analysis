import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "axios";

function Employee() {
  let { eid } = useParams();
  const [employeeData, setEmployeeData] = useState([]);

  useEffect(() => {
    async function getData() {
      let token = localStorage.getItem("token");

      try {
        const employeeResponse = await axios.get(`/API/employee/${eid}/`, {
          headers: {
            Authorization: `${token}`,
          },
        });

        setEmployeeData(employeeResponse.data);
        console.log(employeeResponse.data);
      } catch (error) {
        console.log(error);
      }
    }
    getData();
  }, []);

  return (
    <>
      <Link
        to={`/employee/${eid}/new`}
        className="focus:outline-none text-white bg-purple-700 hover:bg-purple-800 focus:ring-4 focus:ring-purple-300 font-medium rounded-lg text-sm px-5 py-2.5 m-8 dark:bg-purple-600 dark:hover:bg-purple-700 dark:focus:ring-purple-900 mt-6"
      >
        Add New Employee
      </Link>
      {employeeData && employeeData["allEmployee"]
        ? employeeData["allEmployee"].map((empployee) => {
            return (
              <>
                <div>{empployee.name}</div>
              </>
            );
          })
        : ""}
    </>
  );
}

export default Employee;
