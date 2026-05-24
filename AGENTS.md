# Repository Notes

- Use pnpm for this project: `pnpm install`, `pnpm dev`, `pnpm lint`, and `pnpm build`.
- Keep `pnpm-lock.yaml` as the authoritative lockfile. Do not recreate `package-lock.json`.
- `pnpm dev` intentionally runs `next dev --webpack`; Turbopack dev currently resolves Tailwind from the wrong directory after the pnpm migration. Keep this unless Turbopack dev has been retested.
- The Codex sandbox can block network access. If a necessary command fails with DNS, registry, or Google Fonts fetch errors, rerun that same command with sandbox escalation instead of changing project config to work around the sandbox.
- `pnpm build` may need network access because `next/font` fetches Google Fonts during the build.
