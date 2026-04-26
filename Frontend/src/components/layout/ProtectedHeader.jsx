import { tokenService } from "@/services/tokenService";
import OwnerHeader from "./OwnerHeader";
import EmployeeHeader from "./EmployeeHeader";
import ManagerHeader from "./ManagerHeader";

export default function ProtectedHeader() {
    const role = tokenService.getRole();

    // Debugging: Ensure role case is consistent
    const normalizedRole = role ? role.toUpperCase() : "";

    switch (normalizedRole) {
        case "OWNER":
            return <OwnerHeader />;
        case "EMPLOYEE":
            return <EmployeeHeader />;
        case "MANAGER":
            return <ManagerHeader />;
        default:
            return null;
    }
}
