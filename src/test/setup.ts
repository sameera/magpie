import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import { endSession } from "../app/shoppingSession";
import { setTripPath } from "../app/tripStore";

afterEach(() => {
    cleanup();
    sessionStorage.clear();
    setTripPath(null);
    endSession();
});
