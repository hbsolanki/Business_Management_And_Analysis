import Linechart from "../../Analysis/charts/Linechart";
import PieActiveArc from "./PieActiveArc";
import IMG1 from "../../../assets/Home/EmployeeManagementIMG.png";
import IMG2 from "../../../assets/Home/ManageInventoryIMG.png";

const features = [
  {
    title: "Manage Inventory",
    description:
      "Keep track of stock levels, monitor inventory movement, and ensure you never run out of critical items.",
    image: IMG2,
  },
  {
    title: "Employee Management",
    description:
      "Organize your workforce efficiently with tools to manage roles, schedules, and performance.",
    image: IMG1,
  },
  {
    title: "Sales Tracking",
    description:
      "Monitor sales trends and revenue growth with intuitive dashboards and reports.",
    customComponent: (
      <div className="w-full overflow-x-auto">
        <Linechart Data={[5000, 5623, 6381, 7234, 8122]} h={170} t={350} />
      </div>
    ),
  },
  {
    title: "Data Visualization",
    description:
      "Analyze key metrics with powerful charts, graphs, and reports to make informed decisions.",
    customComponent: (
      <div className="w-full overflow-x-auto">
        <PieActiveArc
          data={[
            { label: "Manufacturing", value: 35.0 },
            { label: "Marketing", value: 20.0 },
            { label: "Salaries", value: 25.0 },
            { label: "Research & Development", value: 10.0 },
            { label: "Other", value: 10.0 },
          ]}
          valueFormatter={(item) => `${item.value}%`}
        />
      </div>
    ),
  },
];

export default function FeaturesSection() {
  return (
    <section className="bg-white pt-14 md:mx-12 md:mt-12 rounded-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-10">
          Key Features
        </h2>
        <div className="flex flex-col gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className={`flex flex-col sm:flex-row items-center bg-gray-50 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow duration-300 ${
                index === features.length - 1 ? "mb-8" : ""
              }`}
            >
              <div className="w-full sm:w-1/3">
                {feature.image ? (
                  <img
                    src={feature.image}
                    alt={feature.title}
                    className="w-full h-auto rounded-lg"
                  />
                ) : (
                  feature.customComponent
                )}
              </div>
              <div className="w-full sm:w-2/3 sm:pl-6 mt-4 sm:mt-0 text-center sm:text-left">
                <h3 className="text-2xl font-semibold text-gray-800 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
