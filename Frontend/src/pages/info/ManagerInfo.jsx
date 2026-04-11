import RoleGuidePage from "@/features/info/components/RoleGuidePage";

const MANAGER_RHYTHM = [
    {
        title: "Start with workforce status",
        description: "Confirm employee attendance, assignments, and urgent open tasks at shift start.",
    },
    {
        title: "Supervise core operations",
        description: "Monitor product updates, inventory movement, and invoice quality throughout the day.",
    },
    {
        title: "Escalate and coordinate",
        description: "Use chat and task comments for blockers, and escalate business-level concerns to owner.",
    },
    {
        title: "Close daily loop",
        description: "Review progress metrics, pending work, and data quality before handoff.",
    },
];

const MANAGER_CHECKS = [
    "Employee roles and assignments match current operational need.",
    "Stock levels and transaction entries remain consistent.",
    "Invoices include correct product, quantity, and amount details.",
    "Cost and analytics data are reviewed for unusual variance.",
    "Critical issues are escalated to owner with clear context.",
];

export default function ManagerInfo() {
    return (
        <RoleGuidePage
            roleKey="MANAGER"
            title="Manager Guide"
            description="Operational leadership guide for staff supervision, execution quality, and daily reporting."
            operatingRhythm={MANAGER_RHYTHM}
            qualityChecks={MANAGER_CHECKS}
        />
    );
}
