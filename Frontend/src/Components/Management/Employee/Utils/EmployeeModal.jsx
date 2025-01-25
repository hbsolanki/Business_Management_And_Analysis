import { Link } from "react-router-dom";

function EmployeeModal({ employee, onClose, onDelete, eid }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-96 p-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-4">
          {employee.name}
        </h3>
        <p className="text-gray-600">Email: {employee.email}</p>
        <p className="text-gray-600">Salary: ₹{employee.salary || "N/A"}</p>
        {employee.mobile && (
          <p className="text-gray-600">Mobile: {employee.mobile || "N/A"}</p>
        )}
        <p className="text-gray-600">
          Description: {employee.description || "No description available."}
        </p>
        <div className="mt-6 flex justify-end space-x-4">
          <Link
            to={`/employee/${eid}/${employee._id}/edit`}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Edit
          </Link>
          <button
            onClick={() => onDelete(employee._id)}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
          >
            Delete
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default EmployeeModal;
