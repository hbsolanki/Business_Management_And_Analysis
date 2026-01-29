import FeatureSection from "@/features/info/components/FeatureSection";

export default function EmployeeInfo() {
    return (
        <div className="max-w-4xl">
            <div className="mb-10">
                <h1 className="text-3xl font-extrabold text-gray-900 mb-4">Employee Guide</h1>
                <p className="text-lg text-gray-600">
                    Welcome to the team! Your access in Visionary is determined by the "Work" assigned to you. This guide explains the different tools you might use.
                </p>
            </div>

            <FeatureSection
                title="Understanding Work Assignments"
                description="You are assigned specific 'Work' types by your Manager or Owner. You will only see the features relevant to your assigned work."
                keyTerms={[
                    { term: "Product Work", definition: "Grants access to add, edit, and view products." },
                    { term: "Inventory Work", definition: "Grants access to manage stock levels and record transactions." },
                    { term: "Invoice Work", definition: "Grants access to create invoices and process sales." }
                ]}
            />

            <FeatureSection
                title="Product Management"
                description="If you are assigned 'Product' work, you are responsible for maintaining the digital catalog of items sold."
                howItWorks={[
                    "Navigate to the 'Products' page.",
                    "Use 'Add Product' to introduce new items to the system.",
                    "Ensure pricing and descriptions are accurate."
                ]}
            />

            <FeatureSection
                title="Inventory Control"
                description="If you are assigned 'Inventory' work, you help keep track of physical stock."
                howItWorks={[
                    "Go to the 'Inventory' section.",
                    "Record 'Transactions' when stock is added (restock) or removed (damage/expiry).",
                    "Ensure the digital stock counts match the physical reality."
                ]}
            />

            <FeatureSection
                title="Invoicing & Sales"
                description="If you are assigned 'Invoice' work, you are at the point of sale, processing customer transactions."
                howItWorks={[
                    "Go to 'Invoice > New' to start a sale.",
                    "Add products to the invoice by searching the catalog.",
                    "Generate the final invoice for the customer."
                ]}
            />
        </div>
    );
}
