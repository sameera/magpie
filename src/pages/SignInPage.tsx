import { useState } from "react";
import { Navigate } from "react-router";
import { logError } from "../services/errors";
import { Splash } from "../app/Splash";
import { readReturnPath, useServices, useSession } from "../app/session";

export function SignInPage() {
    const session = useSession();
    const { auth } = useServices();
    const [busy, setBusy] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    if (session.status === "starting" || session.status === "checking") {
        return <Splash />;
    }
    if (session.status === "member") {
        return <Navigate to={readReturnPath() ?? "/"} replace />;
    }

    async function run(operation: "signIn" | "signOut"): Promise<void> {
        setBusy(true);
        setError(null);
        try {
            await auth[operation]();
        } catch (error: unknown) {
            logError(`auth.${operation}`, {}, error);
            setError(error instanceof Error ? error.message : "Sign-in failed. Please try again.");
        } finally {
            setBusy(false);
        }
    }

    return (
        <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-paper px-4 text-center text-ink">
            <img src="/icons/magpie-mascot.svg" alt="" className="size-32" />
            <h1 className="font-display text-display">Magpie</h1>
            {error && <p role="alert" className="text-body">{error}</p>}
            {session.status === "not-member" ? (
                <>
                    <p className="text-body">
                        {session.user.email ?? "This account"} is not in our household. Sign in with the account
                        your household uses.
                    </p>
                    <button
                        type="button"
                        disabled={busy}
                        onClick={() => run("signOut")}
                        className="h-tap w-full max-w-sm rounded-md border-2 border-line-strong bg-surface text-button"
                    >
                        Try another account
                    </button>
                </>
            ) : (
                <>
                    <p className="text-body">Our shopping list, laid out on the store's map.</p>
                    <button
                        type="button"
                        disabled={busy}
                        onClick={() => run("signIn")}
                        className="h-tap w-full max-w-sm rounded-md bg-sheen text-button text-on-sheen shadow-press"
                    >
                        {busy ? "Signing in…" : "Sign in with Google"}
                    </button>
                </>
            )}
        </main>
    );
}
