# store/

Global Zustand stores — state shared across features (e.g. session, active
try-on session). Prefer local `useState`/TanStack Query for anything scoped
to one screen or server-owned; reach for a global store only when several
unrelated parts of the tree need the same client state.
