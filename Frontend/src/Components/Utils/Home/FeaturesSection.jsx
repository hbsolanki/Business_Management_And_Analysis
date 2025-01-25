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
      <Linechart Data={[5000, 5623, 6381, 7234, 8122]} h={170} t={350} />
    ),
  },
  {
    title: "Data Visualization",
    description:
      "Analyze key metrics with powerful charts, graphs, and reports to make informed decisions.",
    customComponent: (
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
    ),
  },
];

export default function FeaturesSection() {
  return (
    <section className="bg-gray-50 pt-14">
      <div className="container mx-auto px-6 sm:px-12 lg:px-20">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-10">
          Key Features
        </h2>
        <div className="flex flex-col gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="flex flex-col sm:flex-row items-center bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow duration-300"
            >
              <div className="sm:w-1/3">
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
              <div className="sm:w-2/3 sm:pl-6">
                <h3 className="text-2xl font-semibold text-gray-800 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 mb-4">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
