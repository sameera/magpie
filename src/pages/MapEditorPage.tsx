import { useParams } from "react-router";
import { UpButton } from "../app/UpButton";
import { PageHeader } from "./PageHeader";

export function MapEditorPage() {
    const { storeId } = useParams();
    return <PageHeader title="Map editor" before={<UpButton to={`/stores/${storeId}`} label="Back to store" />} />;
}
