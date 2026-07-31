# components/

Shared, reusable, presentational UI components with no feature-specific business
logic (buttons, inputs, cards, layout primitives). Style with NativeWind
(`className`), not `StyleSheet.create`, unless a style genuinely can't be
expressed in Tailwind utilities.

Component-specific logic belongs in `features/`, not here.
