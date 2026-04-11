import RoleGuidePage from "@/features/info/components/RoleGuidePage";

const OWNER_RHYTHM = [
    {
        title: "Review business health",
        description: "Check dashboard summaries, subscription usage, and pending task load before assigning work.",
    },
    {
        title: "Control team structure",
        description: "Create or update manager/employee accounts and confirm role permissions are still accurate.",
    },
    {
        title: "Validate financials",
        description: "Audit invoice flow, monthly costs, and analytics trend charts before month-end decisions.",
    },
    {
        title: "Plan optimization",
        description: "Use analytics and cost reports to adjust product pricing, inventory strategy, and staffing plans.",
    },
];

const OWNER_CHECKS = [
    "Business profile has valid name, GST number, and description.",
    "Every manager and employee has only required permissions.",
    "Subscription plan limits are monitored before onboarding more staff.",
    "Monthly costs are entered and categorized before analytics review.",
    "Task + chat communication stays aligned with current priorities.",
];

export default function OwnerInfo() {
    return (
        <RoleGuidePage
            roleKey="OWNER"
            title="Owner Guide"
            description="End-to-end control for business setup, operations governance, and strategic financial tracking."
            operatingRhythm={OWNER_RHYTHM}
            qualityChecks={OWNER_CHECKS}
        />
    );
}
