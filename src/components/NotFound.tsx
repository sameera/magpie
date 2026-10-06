import { UpButton } from "../app/UpButton";
import { PageHeader } from "../pages/PageHeader";

interface NotFoundProps {
    what: string;
    parent: string;
    parentLabel: string;
}

// For a path naming an item or store that does not exist, or that this user cannot read.
export function NotFound({ what, parent, parentLabel }: NotFoundProps) {
    return (
        <>
            <PageHeader title="Not found" />
            <p className="mb-6 text-body">This {what} isn't here. It may have been removed.</p>
            <UpButton to={parent} label={parentLabel}>
                {parentLabel}
            </UpButton>
        </>
    );
}
