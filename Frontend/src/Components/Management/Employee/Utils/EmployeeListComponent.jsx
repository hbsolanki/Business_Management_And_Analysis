function EmployeeListComponent({ employees, onRightClick }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {employees.map((employee) => (
        <div
          key={employee._id}
          onContextMenu={(e) => onRightClick(e, employee)}
          className="bg-white border border-gray-200 rounded-lg shadow p-4 text-center cursor-pointer"
        >
          <h3 className="text-lg font-semibold text-gray-900">
            {employee.name}
          </h3>
          <p className="text-gray-600">{employee.email}</p>
        </div>
      ))}
    </div>
  );
}

export default EmployeeListComponent;
