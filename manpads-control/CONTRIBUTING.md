# Contributing to MANPADS Control Panel

Thank you for your interest in contributing!

## Getting Started

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/MANPADS-System-Launcher-and-Rocket.git
   cd MANPADS-System-Launcher-and-Rocket/manpads-control
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Start development:
   ```bash
   npm run dev
   ```

## Development Workflow

### Frontend (Next.js)
- Located in `src/`
- Components use Supabase-inspired design system (see `DESIGN.md`)
- State managed via Zustand in `src/store/`
- Run linter: `npm run lint`
- Type check: `npm run typecheck`

### Backend (Rust/Tauri)
- Located in `src-tauri/`
- UDP socket: `src-tauri/src/backend/udp/`
- SQLite storage: `src-tauri/src/backend/storage/`
- Tauri commands: `src-tauri/src/backend/commands/`
- Run tests: `cd src-tauri && cargo test`
- Build: `cd src-tauri && cargo build --release`

## Code Style

- **TypeScript**: Use explicit types, avoid `any`
- **Rust**: Follow standard conventions, use `rustfmt`
- **Styling**: TailwindCSS classes, see `DESIGN.md` for tokens

### Pre-commit Hooks

```bash
# Format before committing
npm run lint  # Frontend
cargo fmt    # Backend

# Type checking
npm run typecheck
cargo check
```

## Commit Conventions

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation |
| `style` | Formatting, no code change |
| `refactor` | Code refactoring |
| `test` | Tests |
| `chore` | Maintenance |

### Examples

```bash
git commit -m "feat(telemetry): add rolling buffer for display"
git commit -m "fix(socket): resolve command queue overflow"
git commit -m "docs(readme): add quick start section"
```

## Pull Request Process

1. Create a feature branch: `git checkout -b feature/amazing-feature`
2. Make changes with clear commit messages
3. Ensure tests pass: `cargo test` / `npm run test`
4. Submit a PR with description of changes

### PR Title Format

Same as commit conventions:
```
feat(telemetry): add rolling buffer
fix(udp): handle disconnection gracefully
```

## Reporting Issues

Use GitHub Issues with:
- Clear title describing the problem
- Steps to reproduce
- Expected vs actual behavior
- Environment details (macOS version, etc.)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.