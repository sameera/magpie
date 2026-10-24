import { Plus } from "lucide-react";
import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { useHouseholdId, useServices } from "../app/session";
import { categoryKey, categoryNameProblem, cleanCategoryName } from "../data/categoryName";
import { useCategories } from "../data/hooks";

// Inline "Add category" on Inventory: a name field, Save and Cancel. Saving does
// not wait for the server; a refusal is reported through `onRefused`.
export function AddCategoryForm({ onRefused, heading }: { onRefused: (message: string) => void; heading?: ReactNode }) {
    const householdId = useHouseholdId();
    const { data } = useServices();
    const categories = useCategories();
    const keys = categories.status === "ready" ? categories.value.map(({ id }) => id) : [];
    const latestKeys = useRef(keys);
    latestKeys.current = keys;
    const [open, setOpen] = useState(false);
    const [text, setText] = useState("");
    const [problem, setProblem] = useState("");

    const close = () => {
        setOpen(false);
        setText("");
        setProblem("");
    };

    const save = (event: FormEvent) => {
        event.preventDefault();
        const reason = categoryNameProblem(text, keys);
        if (reason) {
            setProblem(reason);
            return;
        }
        const name = cleanCategoryName(text);
        const id = categoryKey(name);
        data.createCategory(householdId, { id, name }).catch(() => {
            // The category the member wanted already exists: nothing to report.
            if (!latestKeys.current.includes(id)) {
                onRefused(`"${name}" could not be added.`);
            }
        });
        close();
    };

    if (!open) {
        return (
            <div className="mb-3 flex items-center justify-between gap-3">
                {heading}
                <button type="button" aria-label="Add Category" title="Add Category" onClick={() => setOpen(true)} className="flex h-tap w-tap shrink-0 items-center justify-center rounded-md border-2 border-line-strong bg-surface text-sheen-ink">
                    <Plus aria-hidden="true" />
                </button>
            </div>
        );
    }
    return (
        <>
            {heading && <div className="mb-3">{heading}</div>}
            <form onSubmit={save} className="mb-6 flex flex-col gap-3">
                <label className="flex flex-col gap-1 text-body">
                    Category name
                    <input
                        autoFocus
                        value={text}
                        onChange={(event) => setText(event.target.value)}
                        aria-invalid={problem !== ""}
                        className="h-tap rounded-md border-2 border-line-strong bg-surface-sunken px-3 text-body"
                    />
                </label>
                {problem && <p role="alert" className="text-body text-danger">{problem}</p>}
                <div className="flex gap-3">
                    <button type="submit" className="h-tap rounded-md bg-sheen px-4 text-button text-on-sheen">Save</button>
                    <button type="button" onClick={close} className="h-tap rounded-md border-2 border-line-strong bg-surface px-4 text-button">Cancel</button>
                </div>
            </form>
        </>
    );
}
