# Magpie agent instructions

Read and follow [CLAUDE.md](CLAUDE.md) for project context, development commands, standards, and decision recording.

## Test-first development

- Use test-first development for application changes, including bug fixes and UI changes: write or update a meaningful test for the requested behavior before changing implementation code.
- Run the test and verify that it fails because the requested behavior is missing, then make the smallest implementation change that makes it pass. Refactor only with the test passing, and run the relevant regression checks afterward.
- Test observable behavior rather than mirroring implementation details. For visual layout changes, use an appropriate browser or visual check that can demonstrate the failure before implementation and verify the result afterward.
- Passing existing tests after implementation alone does not count as test-first development. Report which check failed before the change and passed afterward.
- Documentation-only changes do not require tests. If a suitable test or visual check cannot be run, state the limitation explicitly; do not claim test-first verification.

## Firebase rules for data operations

- Whenever a new or changed data operation is planned, decided, or implemented, include its Firebase security rules in the same scope of work. This applies to reads, queries, creates, updates, deletes, and file access in Firestore or Cloud Storage.
- During planning and decisions, specify the affected paths, data shape, allowed operations, and household membership requirements. Identify the required changes to `firestore.rules` or `storage.rules`, or explain why existing rules already cover the operation.
- During implementation, update the rules alongside the application code and add or update emulator rule tests. Verify allowed access and denied access for signed-out users, non-members, other households, and invalid writes as applicable. Run `pnpm test:rules` before declaring the operation complete.
- Set up any required membership records through the trusted setup process. Preserve household isolation; never solve permission errors by allowing unrestricted access.
- For a live operation, deploy the tested rules to the Firebase project actually configured in the app, using an explicit `--project <id>`. Check the active environment configuration against `.firebaserc`; never assume the default or `prod` alias targets the app's database. Verify deployment before reporting the live operation ready. If deployment is blocked, report the blocker and the remaining deployment step explicitly.
