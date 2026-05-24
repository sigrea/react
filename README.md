# @sigrea/react

React hooks for [@sigrea/core](https://www.npmjs.com/package/@sigrea/core).
Use this package when a React component needs to mount a molecule, read a
Sigrea signal, or subscribe to a deep signal object.

`@sigrea/react` does not replace React state. It subscribes components to
Sigrea signals and mounts molecules with the component lifecycle.

## Install

```bash
npm install @sigrea/react @sigrea/core react react-dom
```

Requires React 18+ and Node.js 24 or later.

Install [`@sigrea/use`][sigrea-use] too if your shared molecules use helpers
from that package, such as `createEvents`.

## Quick Start

Define state in a molecule. Mount that molecule in a component with
`useMolecule()`, then read returned signals with `useSignal()`.

```tsx
import { molecule, readonly, signal } from "@sigrea/core";
import { useMolecule, useSignal } from "@sigrea/react";

const CounterMolecule = molecule(() => {
  const count = signal(0);

  const increment = () => {
    count.value++;
  };

  return {
    count: readonly(count),
    increment,
  };
});

export function Counter() {
  const counter = useMolecule(CounterMolecule);
  const count = useSignal(counter.count);

  return (
    <button type="button" onClick={counter.increment}>
      Count: {count}
    </button>
  );
}
```

Use `useComputed()` when the source is known to be a `computed()` value and you
want TypeScript to enforce that. `useSignal()` also works with computed values.

## Molecules With Props

Pass a props object when the molecule only needs the initial values. React keeps
the same molecule instance while the factory stays the same, so object props are
not resynced on each render.

```tsx
import { molecule, readonly, signal } from "@sigrea/core";
import { useMolecule, useSignal } from "@sigrea/react";

const CounterMolecule = molecule((props: { initialCount: number }) => {
  const count = signal(props.initialCount);

  const reset = () => {
    count.value = props.initialCount;
  };

  const increment = () => {
    count.value++;
  };

  return {
    count: readonly(count),
    increment,
    reset,
  };
});

function Counter({ initialCount }: { initialCount: number }) {
  const counter = useMolecule(CounterMolecule, { initialCount });
  const count = useSignal(counter.count);

  return (
    <>
      <span>Count: {count}</span>
      <button type="button" onClick={counter.increment}>
        Increment
      </button>
      <button type="button" onClick={counter.reset}>
        Reset
      </button>
    </>
  );
}
```

Pass a props getter when the molecule must keep reading updated React values.
The dependency list is required and follows normal React rules.

```tsx
import { computed, molecule } from "@sigrea/core";
import { useMolecule, useSignal } from "@sigrea/react";

const LabelMolecule = molecule((props: { label: string }) => {
  return {
    label: computed(() => props.label.trim()),
  };
});

function Label({ label }: { label: string }) {
  const model = useMolecule(LabelMolecule, () => ({ label }), [label]);
  const text = useSignal(model.label);

  return <span>{text}</span>;
}
```

Inside a molecule, read props as `props.name`. Destructuring copies the current
value and loses reactivity.

## Deep Signals

Use `useDeepSignal()` when a component reads or mutates a `deepSignal()` object.
The returned object keeps its identity, and deep mutations trigger a re-render.

```tsx
import { deepSignal } from "@sigrea/core";
import { useDeepSignal } from "@sigrea/react";

const profile = deepSignal({ name: "Mendako" });

export function ProfileForm() {
  const state = useDeepSignal(profile);

  return (
    <label>
      Name
      <input
        value={state.name}
        onChange={(event) => {
          state.name = event.target.value;
        }}
      />
    </label>
  );
}
```

## Controlled Values

For controlled UI, keep the value in a controller molecule. A child molecule
calls `send("update:open", next)` when it wants the value to change.
[`@sigrea/use`][sigrea-use] provides [`createEvents()`][create-events] for this
pattern.

```tsx
import {
  computed,
  get,
  molecule,
  readonly,
  signal,
  toSignal,
} from "@sigrea/core";
import { createEvents } from "@sigrea/use";
import { useMolecule, useSignal } from "@sigrea/react";

type DialogProps = {
  open: boolean;
  disabled?: boolean;
};

type DialogEvents = {
  "update:open": [next: boolean];
};

const DialogMolecule = molecule((props: DialogProps) => {
  const { send, on } = createEvents<DialogEvents>();
  const isOpen = toSignal(props, "open");
  const isDisabled = computed(() => props.disabled ?? false);

  const setOpen = async (next: boolean) => {
    if (isDisabled.value || isOpen.value === next) {
      return;
    }

    await send("update:open", next);
  };

  return {
    on,
    toggle: () => setOpen(!isOpen.value),
  };
});

const DialogControllerMolecule = molecule(() => {
  const isOpen = signal(false);
  const dialog = get(DialogMolecule, () => ({ open: isOpen.value }));

  dialog.on("update:open", (next) => {
    isOpen.value = next;
  });

  return {
    isOpen: readonly(isOpen),
    toggle: dialog.toggle,
  };
});

export function DialogButton() {
  const dialog = useMolecule(DialogControllerMolecule);
  const isOpen = useSignal(dialog.isOpen);

  return (
    <button type="button" onClick={dialog.toggle}>
      {isOpen ? "Close" : "Open"}
    </button>
  );
}
```

Components should not call `dialog.on(...)` in render. Put those event
subscriptions in controller molecules. If a React wrapper needs an `open` and
`onOpenChange` API, wire that at the component boundary.

## API Reference

### `useMolecule`

```tsx
function useMolecule<TReturn extends object>(
  molecule: MoleculeFactory<TReturn, void>
): MoleculeInstance<TReturn, void>

function useMolecule<TReturn extends object, TProps extends object>(
  molecule: MoleculeFactory<TReturn, TProps>,
  props: TProps
): MoleculeInstance<TReturn, TProps>

function useMolecule<TReturn extends object, TProps extends object>(
  molecule: MoleculeFactory<TReturn, TProps>,
  props: () => TProps,
  deps: DependencyList
): MoleculeInstance<TReturn, TProps>
```

Mounts a molecule and returns its instance. `onMount`, `watch`, and
`watchEffect` run after the component commits. In the browser they run before
paint through `useLayoutEffect`. `onUnmount` runs when the component unmounts,
then the molecule is disposed in a microtask.

If a molecule has no props, or all props are optional, you can omit the props
argument.

`@sigrea/react` hooks are for Client Components. Do not call `useMolecule`,
`useSignal`, `useComputed`, or `useDeepSignal` directly from a React Server
Component. During server rendering, molecules can be created for the render
pass, but they are not mounted.

### `useSignal`

```tsx
function useSignal<T>(
  source: Signal<T> | ReadonlySignal<T> | Computed<T>
): T
```

Subscribes to a signal or computed value and returns the current value. The
component re-renders when the source changes.

### `useComputed`

```tsx
function useComputed<T>(source: Computed<T>): T
```

Subscribes to a computed value and returns the current value. Use this when the
call site should only accept `Computed<T>`.

### `useDeepSignal`

```tsx
function useDeepSignal<T extends object>(source: DeepSignal<T>): T
```

Subscribes to a deep signal object. Nested writes trigger a re-render, and the
subscription is cleaned up when the component unmounts.

### `useSnapshot`

```tsx
function useSnapshot<T>(handler: SnapshotHandler<T>): T
```

Low-level hook for custom snapshot handlers from `@sigrea/core`. Most apps use
`useSignal`, `useComputed`, or `useDeepSignal` instead.

## Testing

Use the same shape in tests as in components: render the component, interact
with it, and assert the visible result.

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { Counter } from "./Counter";

it("increments the counter", () => {
  render(<Counter />);

  fireEvent.click(screen.getByRole("button", { name: "Count: 0" }));

  expect(screen.getByRole("button", { name: "Count: 1" })).toBeInTheDocument();
});
```

For molecule-only tests, use `trackMolecule()` and
`disposeTrackedMolecules()` from `@sigrea/core` so mount-scope work is cleaned
up after each test.

## Handling Scope Cleanup Errors

For global error handling configuration, see
[@sigrea/core - Handling Scope Cleanup Errors][core-cleanup-errors].

Configure the handler in your application entry point before rendering:

```tsx
import { setScopeCleanupErrorHandler } from "@sigrea/core";
import { createRoot } from "react-dom/client";
import { App } from "./App";

setScopeCleanupErrorHandler((error, context) => {
  console.error("Cleanup failed:", error);

  if (typeof Sentry !== "undefined") {
    Sentry.captureException(error, {
      tags: { scopeId: context.scopeId, phase: context.phase },
    });
  }
});

createRoot(document.getElementById("root")!).render(<App />);
```

## Development

This repo targets Node.js 24 or later.

- `pnpm install` installs dependencies.
- `pnpm test` runs the Vitest suite once.
- `pnpm typecheck` runs TypeScript checks.
- `pnpm test:coverage` collects coverage.
- `pnpm build` builds CJS and ESM bundles with unbuild.
- `pnpm -s cicheck` runs the local CI chain.
- `pnpm dev` launches the playground counter demo.

If you use mise, run `mise trust -y` once before using mise tasks.

See [CONTRIBUTING.md](https://github.com/sigrea/react/blob/main/CONTRIBUTING.md)
for workflow details.

## License

MIT. See [LICENSE](./LICENSE).

[core-cleanup-errors]: https://github.com/sigrea/core#handling-scope-cleanup-errors
[create-events]: https://github.com/sigrea/use/tree/main/packages/use/createEvents
[sigrea-use]: https://www.npmjs.com/package/@sigrea/use
