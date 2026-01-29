import FeatureSection from "@/features/info/components/FeatureSection";

export default function OwnerInfo() {
    return (
        <div className="max-w-4xl">
            <div className="mb-10">
                <h1 className="text-3xl font-extrabold text-gray-900 mb-4">Owner Guide</h1>
                <p className="text-lg text-gray-600">
                    As an owner, you have full access to all aspects of your business on Visionary. This guide covers managing your business, team, and financials.
                </p>
            </div>

            <FeatureSection
                title="Business Profile"
                description="Your central hub for business identity. Keep your contact details, logo, and business information up to date to ensure professional communication on invoices and reports."
                howItWorks={[
                    "Navigate to the Owner Dashboard.",
                    "Click on 'Edit Business' to update details like Name, Address, and Logo.",
                    "This information is automatically populated on generated invoices."
                ]}
            />

            <FeatureSection
                title="Team Management"
                description="You can build your organization hierarchy by adding Managers and Employees. You have the unique ability to create Managers, who can then help in day-to-day supervision."
                keyTerms={[
                    { term: "Manager", definition: "A role with elevated permissions to oversee employees and view operational analytics." },
                    { term: "Employee", definition: "Staff members who perform specific tasks like sales, inventory, or support." },
                    { term: "Work Assignment", definition: "Specific 'Work' types (Product, Inventory, Invoice) assigned to employees to grant them access to those features." }
                ]}
                howItWorks={[
                    "Go to 'Manage Managers' to add new leadership staff.",
                    "Use 'Manage Employees' to add staff members.",
                    "Assign specific 'Work' permissions (e.g., 'invoice') to employees so they can access the tools they need."
                ]}
            />

            <FeatureSection
                title="Analytics & Financials"
                description="Gain deep insights into your business performance. The Analytics dashboard aggregates data from sales, costs, and inventory to give you a clear picture of your net profit."
                keyTerms={[
                    { term: "Net Profit", definition: "Calculated as Total Sales - (Total Costs + Product Costs)." },
                    { term: "Cost Categories", definition: "Buckets for organizing expenses (e.g., 'Rent', 'Utilities', 'Marketing')." }
                ]}
                howItWorks={[
                    "Visit the 'Analytics' tab for visual charts and summaries.",
                    "Use the 'Cost' section to define categories and record monthly expenses.",
                    "Track 'Real-time Sales' through the daily breakdown charts."
                ]}
            />
        </div>
    );
}
