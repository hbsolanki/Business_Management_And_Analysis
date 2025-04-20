import { Link } from "react-router-dom";

function FiltersComponent({
  searchTerm,
  salaryFilter,
  onSearch,
  onSalaryFilter,
  eid,
}) {
  const handleSearchChange = (e) => {
    onSearch(e.target.value);
  };

  const handleMinChange = (e) => {
    onSalaryFilter(e.target.value, salaryFilter.max);
  };

  const handleMaxChange = (e) => {
    onSalaryFilter(salaryFilter.min, e.target.value);
  };

  return (
    <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4 sm:gap-4">
      {/* Salary Filter and Search */}
      <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 w-full sm:w-auto">
        {/* Salary Filter */}
        <div className="flex items-center gap-2 sm:w-auto mb-4 sm:mb-0">
          <input
            type="number"
            placeholder="Min salary"
            value={salaryFilter.min}
            onChange={handleMinChange}
            className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg shadow-sm"
          />
          <input
            type="number"
            placeholder="Max salary"
            value={salaryFilter.max}
            onChange={handleMaxChange}
            className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg shadow-sm"
          />
        </div>
        {/* Search Input */}
        <input
          type="text"
          placeholder="Search by name..."
          value={searchTerm}
          onChange={handleSearchChange}
          className="w-full sm:w-1/3 px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>
    </div>
  );
}

export default FiltersComponent;
