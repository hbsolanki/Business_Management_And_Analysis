import RoleGuidePage from "@/features/info/components/RoleGuidePage";

const EMPLOYEE_RHYTHM = [
    {
        title: "Check assigned tasks first",
        description: "Open task dashboard and confirm deadlines, ownership, and latest updates.",
    },
    {
        title: "Work in assigned modules only",
        description: "Use product, inventory, invoice, and analytics screens based on granted permissions.",
    },
    {
        title: "Maintain data quality",
        description: "Ensure product, stock, and invoice details are accurate before submission.",
    },
    {
        title: "Report blockers quickly",
        description: "Use chat with manager/owner whenever a task cannot proceed due to missing information.",
    },
];

const EMPLOYEE_CHECKS = [
    "Task status updates are posted as soon as progress changes.",
    "Product and inventory updates are complete and error-free.",
    "Invoices are created only after item and quantity validation.",
    "Communication is captured in chat to avoid duplicate work.",
    "Profile details remain up to date for clear accountability.",
];

export default function EmployeeInfo() {
    return (
        <RoleGuidePage
            roleKey="EMPLOYEE"
            title="Employee Guide"
            description="Execution-focused guide for assigned work modules, task completion, and communication."
            operatingRhythm={EMPLOYEE_RHYTHM}
            qualityChecks={EMPLOYEE_CHECKS}
        />
    );
}
