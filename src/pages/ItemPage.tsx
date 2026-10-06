import { UpButton } from "../app/UpButton";
import { PageHeader } from "./PageHeader";

export function ItemPage() {
    return <PageHeader title="Item" before={<UpButton to="/" label="Back to list" />} />;
}
