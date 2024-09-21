// import { useEffect, useState } from "react";
// import { Link, useParams } from "react-router-dom";
// import axios from "axios";

// function Employee() {
//   let { eid } = useParams();
//   const [employeeData, setEmployeeData] = useState([]);
//   const [searchTerm, setSearchTerm] = useState(""); // State for the search input
//   const [filteredEmployees, setFilteredEmployees] = useState([]); // State for the filtered employee list

//   useEffect(() => {
//     async function getData() {
//       let token = localStorage.getItem("token");

//       try {
//         const employeeResponse = await axios.get(`/API/employee/${eid}/`, {
//           headers: {
//             Authorization: `${token}`,
//           },
//         });

//         const allEmployees = employeeResponse.data.allEmployee;
//         setEmployeeData(allEmployees);
//         setFilteredEmployees(allEmployees); // Set filtered employees to all by default
//       } catch (error) {
//         console.log(error);
//       }
//     }
//     getData();
//   }, [eid]);

//   // Handle search input change
//   const handleSearch = (e) => {
//     setSearchTerm(e.target.value);

//     // Filter employees by name based on search input
//     if (e.target.value === "") {
//       setFilteredEmployees(employeeData); // Show all employees when search is cleared
//     } else {
//       const filtered = employeeData.filter((employee) =>
//         employee.name.toLowerCase().includes(e.target.value.toLowerCase())
//       );
//       setFilteredEmployees(filtered);
//     }
//   };

//   return (
//     <>
//       <Link
//         to={`/employee/${eid}/new`}
//         className="focus:outline-none text-white bg-orange-500 hover:bg-orange-600 focus:ring-4 focus:ring-orange-300 font-medium rounded-lg text-sm px-5 py-2.5 m-8 dark:bg-orange-400 dark:hover:bg-orange-500 dark:focus:ring-orange-700 mt-6"
//       >
//         Add New Employee
//       </Link>

//       {/* Search Bar */}
//       <div className="max-w-5xl mx-auto p-4">
//         <input
//           type="text"
//           placeholder="Search employees by name..."
//           value={searchTerm}
//           onChange={handleSearch}
//           className="mb-6 w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
//         />

//         <h2 className="text-2xl font-bold mb-6">Employee List</h2>

//         {/* Employee List */}
//         {filteredEmployees && filteredEmployees.length > 0 ? (
//           <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
//             {filteredEmployees.map((employee, idx) => (
//               <div
//                 key={idx}
//                 className="bg-white border border-gray-300 rounded-lg shadow-md p-4 text-center"
//               >
//                 {/* Employee Photo */}
//                 <img
//                   src={employee.photoUrl || "https://via.placeholder.com/100"}
//                   alt={employee.name}
//                   className="w-20 h-20 rounded-full mx-auto"
//                 />

//                 <h3 className="text-sm font-semibold text-gray-800 mt-2">
//                   {employee.name}
//                 </h3>
//                 <p className="text-xs text-gray-600 mt-1">{employee.email}</p>
//                 <p className="text-xs text-gray-600 mt-1">
//                   Salary: ₹{employee.salary}
//                 </p>
//                 <p className="text-xs text-gray-600 mt-1">
//                   Mobile: {employee.mobile}
//                 </p>

//                 {/* Edit and Delete buttons */}
//                 <div className="mt-3 flex justify-center space-x-2">
//                   <Link
//                     to={`/employee/${employee._id}/edit`}
//                     className="text-blue-500 hover:underline text-xs"
//                   >
//                     Edit
//                   </Link>
//                   <Link
//                     to={`/employee/${employee._id}/delete`}
//                     className="text-red-500 hover:underline text-xs"
//                   >
//                     Delete
//                   </Link>
//                 </div>
//               </div>
//             ))}
//           </div>
//         ) : (
//           <p>No employees found.</p>
//         )}
//       </div>
//     </>
//   );
// }

// export default Employee;

import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import axios from "axios";

function EditEmployee() {
  let { eid, oeid } = useParams();
  const navigate = useNavigate();
  const [employeeData, setEmployeeData] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    email: "",
    mobile: "",
    salary: "",
    address: "",
    workpage: "",
    password: "",
    image: null, // Add image to formData state
  });

  useEffect(() => {
    async function getData() {
      let token = localStorage.getItem("token");

      try {
        const response = await axios.get(`/API/employee/one/${oeid}/`, {
          headers: {
            Authorization: `${token}`,
          },
        });

        const data = response.data;
        setEmployeeData(data);
        setFormData({
          name: data.name || "",
          description: data.description || "",
          email: data.email || "",
          mobile: data.mobile || "",
          salary: data.salary || "",
          address: data.address || "",
          workpage: data.workpage || "",
          password: data.password || "",
          image: null, // Keep image field as null initially
        });
      } catch (error) {
        console.log(error);
      }
    }
    getData();
  }, [oeid]);

  const handleChange = (e) => {
    const name = e.target.name;
    const value = name === "image" ? e.target.files[0] : e.target.value; // Handle image file input
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    let token = localStorage.getItem("token");

    // Create FormData object to handle both text fields and image
    const formDataToSend = new FormData();
    for (const key in formData) {
      formDataToSend.append(key, formData[key]);
    }

    try {
      await axios.post(
        `/API/employee/${eid}/${oeid}/edit/`,
        formDataToSend, // Send FormData object
        {
          headers: {
            "Content-Type": "multipart/form-data", // Ensure multipart/form-data for file upload
            Authorization: `${token}`,
          },
        }
      );
      navigate(`/employee/${eid}`);
    } catch (err) {
      console.log(err.message);
    }
  };

  if (!employeeData) return <p>Loading...</p>;

  return (
    <>
      <div className="flex min-h-full flex-1 flex-col justify-center px-6 py-12 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-sm">
          <h2 className="mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
            Edit Employee
          </h2>
        </div>

        <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
          <form
            className="space-y-6"
            onSubmit={handleSubmit}
            method="post"
            encType="multipart/form-data"
          >
            {/* Form fields remain the same */}

            <div>
              <label
                htmlFor="image"
                className="block text-sm font-medium leading-6 text-gray-900"
              >
                Select Image
              </label>
              <div className="mt-2">
                <input
                  id="image"
                  name="image"
                  type="file"
                  onChange={handleChange}
                  className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              >
                Edit Employee
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

export default EditEmployee;
