import { defineConfig } from "vitest/config";

// Security-rule tests. They run inside `firebase emulators:exec` (pnpm test:rules).
export default defineConfig({
    test: {
        environment: "node",
        include: ["rules-tests/**/*.test.ts"],
        testTimeout: 20000,
        fileParallelism: false,
    },
});
