import { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router";
import { HouseholdProvider, clearReturnPath, saveReturnPath, useSession } from "./session";
import { Splash } from "./Splash";

// Runs before every page except Sign-in. Convenience only: the security rules
// are what keep other people out.
export function SignInGate() {
    const session = useSession();
    const location = useLocation();
    const isMember: boolean = session.status === "member";

    useEffect(() => {
        if (isMember) {
            clearReturnPath();
        }
    }, [isMember]);

    switch (session.status) {
        case "starting":
        case "checking":
            return <Splash />;
        case "signed-out":
            saveReturnPath(location.pathname + location.search);
            return <Navigate to="/sign-in" replace />;
        case "not-member":
            return <Navigate to="/sign-in" replace />;
        case "member":
            return (
                <HouseholdProvider householdId={session.householdId}>
                    <Outlet />
                </HouseholdProvider>
            );
    }
}
