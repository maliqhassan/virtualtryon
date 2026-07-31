# features/

Feature-based modules (e.g. `try-on/`, `wardrobe/`, `profile/`). Each feature
folder owns its own screens' supporting components, hooks, API calls, and
Zustand slice — colocated rather than split across global `components/` or
`hooks/` folders. Routes in `app/` stay thin and import from here.

Empty until the first feature is implemented.
