import { describe, expect, it } from "vitest";
import { authDomainForHost } from "./authDomain";

describe("redirect auth domain", () => {
    it.each(["localhost", "127.0.0.1", "[::1]"])(
        "uses the project's default auth endpoint for live popups on %s",
        (hostname) => {
            expect(authDomainForHost(hostname, "awzmlist.web.app", false)).toBe("awzmlist.firebaseapp.com");
        },
    );

    it("keeps explicit auth domains and emulator configuration on localhost", () => {
        expect(authDomainForHost("localhost", "auth.example.com", false)).toBe("auth.example.com");
        expect(authDomainForHost("localhost", "awzmlist.firebaseapp.com", false)).toBe("awzmlist.firebaseapp.com");
        expect(authDomainForHost("localhost", "awzmlist.web.app", true)).toBe("awzmlist.web.app");
    });

    it.each(["awzm-magpie.web.app", "awzm-magpie.firebaseapp.com", "awzmlist.web.app"])(
        "keeps the auth helper same-origin on %s despite stale configuration",
        (hostname) => {
            expect(authDomainForHost(hostname, "old-project.firebaseapp.com", false)).toBe(hostname);
        },
    );

    it("preserves the configured domain for local emulators", () => {
        expect(authDomainForHost("localhost", "localhost", true)).toBe("localhost");
        expect(authDomainForHost("example.web.app", "localhost", true)).toBe("localhost");
    });

    it("preserves explicit configuration outside Firebase Hosting", () => {
        expect(authDomainForHost("shopping.example.com", "auth.example.com", false)).toBe("auth.example.com");
        expect(authDomainForHost("example.web.app.evil.com", "auth.example.com", false)).toBe("auth.example.com");
    });
});
