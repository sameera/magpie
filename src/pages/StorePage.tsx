import { useParams } from "react-router";
import { UpButton } from "../app/UpButton";
import { PageHeader } from "./PageHeader";

export function StorePage() {
    const { storeId } = useParams();
    return <PageHeader title={`Store ${storeId}`} before={<UpButton to="/stores" label="Back to stores" />} />;
}
