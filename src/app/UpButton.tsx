import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { useUp } from "./history";

interface UpButtonProps {
    to: string;
    label: string;
    children?: ReactNode;
}

export function UpButton({ to, label, children }: UpButtonProps) {
    const up = useUp(to);
    return (
        <button
            type="button"
            onClick={up}
            aria-label={children ? undefined : label}
            className="inline-flex h-tap min-w-tap items-center justify-center gap-2 rounded-md px-2 text-button text-sheen-ink"
        >
            {children ?? <ArrowLeft aria-hidden="true" />}
        </button>
    );
}
