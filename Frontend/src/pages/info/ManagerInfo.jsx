import FeatureSection from "@/features/info/components/FeatureSection";

export default function ManagerInfo() {
    return (
        <div className="max-w-4xl">
            <div className="mb-10">
                <h1 className="text-3xl font-extrabold text-gray-900 mb-4">Manager Guide</h1>
                <p className="text-lg text-gray-600">
                    Managers play a crucial role in operational efficiency. Your primary focus is supervising employees and ensuring daily workflows run smoothly.
                </p>
            </div>

            <FeatureSection
                title="Employee Supervision"
                description="You have the authority to manage the employee roster. This includes adding new employees, updating their profiles, and optimizing their work assignments."
                howItWorks={[
                    "Access the 'Employee Management' section from your dashboard.",
                    "Add new employees and assign them specific roles based on current business needs.",
                    "Update employee details or permissions as their responsibilities evolve."
                ]}
            />

            <FeatureSection
                title="Operational Oversight"
                description="Managers have visibility into key operational metrics. While you don't manage the business entity itself, you monitor the pulse of daily activities."
                keyTerms={[
                    { term: "Product Management", definition: "Overseeing the product catalog to ensure prices and stock levels are accurate." },
                    { term: "Inventory Tracking", definition: "Monitoring stock movements to prevent shortages." }
                ]}
                howItWorks={[
                    "Review product lists to ensure all items are active and correctly priced.",
                    "Check inventory levels and coordinate with the owner if restocking is needed.",
                    "Oversee the invoicing process to ensure sales are recorded correctly."
                ]}
            />
        </div>
    );
}
