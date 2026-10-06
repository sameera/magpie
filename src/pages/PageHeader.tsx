import type { ReactNode } from "react";

export function PageHeader({ title, before, after }: { title: string; before?: ReactNode; after?: ReactNode }) {
    return (
        <header className="mb-6 flex items-center gap-2">
            {before}
            <h1 className="flex-1 font-display text-title">{title}</h1>
            {after}
        </header>
    );
}
