# @sigrea/react

`@sigrea/react` adapts [@sigrea/core](https://www.npmjs.com/package/@sigrea/core) molecule modules and signals for use in React components. It binds scope-aware lifecycles to React commits, synchronizes signal subscriptions with React rendering, and provides hooks for both shallow and deep reactivity.

- **Signal subscriptions.** `useSignal` subscribes to signals and computed values, triggering re-renders when they change.
- **Computed subscriptions.** `useComputed` subscribes to computed values and memoizes them per component instance.
- **Deep signal subscriptions.** `useDeepSignal` subscribes to deep signal objects and exposes them for direct mutation.
- **Molecule lifecycles.** `useMolecule` mounts molecule factories and binds their lifecycles to React components.

## Table of Contents

- [Install](#install)
- [Quick Start](#quick-start)
  - [Consume a Signal](#consume-a-signal)
  - [Bridge Framework-Agnostic Molecules](#bridge-framework-agnostic-molecules)
  - [Work with Deep Signals](#work-with-deep-signals)
- [API Reference](#api-reference)
  - [useSignal](#usesignal)
  - [useComputed](#usecomputed)
  - [useDeepSignal](#usedeepsignal)
  - [useMolecule](#usemolecule)
- [Testing](#testing)
- [Handling Scope Cleanup Errors](#handling-scope-cleanup-errors)
- [Development](#development)
- [License](#license)

## Install

```bash
npm install @sigrea/react @sigrea/core react react-dom
```

Install `@sigrea/use` as well when shared molecules use utilities such as
`createEvents`.

Requires React 18+ and Node.js 24 or later.

## Quick Start

### Consume a Signal

```tsx
import { signal } from "@sigrea/core";
import { useSignal } from "@sigrea/react";

const count = signal(0);

export function CounterLabel() {
  const value = useSignal(count);
  return <span>{value}</span>;
}
```

### Bridge Framework-Agnostic Molecules

```tsx
import {
  computed,
  get,
  molecule,
  readonly,
  signal,
  toSignal,
} from "@sigrea/core";
import { useMolecule, useSignal } from "@sigrea/react";
import { createEvents } from "@sigrea/use";

type DialogProps = {
  open: boolean;
  disabled?: boolean;
};

type DialogEvents = {
  "update:open": [open: boolean];
};

const DialogMolecule = molecule<DialogProps>((props) => {
  const { send, on } = createEvents<DialogEvents>();
  const open = toSignal(props, "open");
  const disabled = computed(() => props.disabled ?? false);

  const requestOpenChange = async (nextOpen: boolean) => {
    if (disabled.value) {
      return;
    }
    await send("update:open", nextOpen);
  };

  return {
    disabled,
    on,
    open,
    requestOpenChange,
  };
});

const DialogControllerMolecule = molecule(() => {
  const open = signal(false);
  const dialog = get(DialogMolecule, () => ({
    open: open.value,
  }));

  dialog.on("update:open", (nextOpen) => {
    open.value = nextOpen;
  });

  return {
    open: readonly(open),
    requestOpenChange: dialog.requestOpenChange,
  };
});

export function DialogButton() {
  const dialog = useMolecule(DialogControllerMolecule);
  const currentOpen = useSignal(dialog.open);

  return (
    <button onClick={() => dialog.requestOpenChange(!currentOpen)}>
      {currentOpen ? "Close" : "Open"}
    </button>
  );
}
```

### Work with Deep Signals

```tsx
import { deepSignal } from "@sigrea/core";
import { useDeepSignal } from "@sigrea/react";

const form = deepSignal({ name: "Mendako" });

export function ProfileForm() {
  const state = useDeepSignal(form);

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

## API Reference

### useSignal

```tsx
function useSignal<T>(
  signal: Signal<T> | ReadonlySignal<T> | Computed<T>
): T
```

Subscribes to a signal or computed value and returns its current value. The component re-renders when the source changes.

Unlike the Vue adapter, this hook returns the unwrapped value `T` directly rather
than a ref.

### useComputed

```tsx
function useComputed<T>(source: Computed<T>): T
```

Subscribes to a computed value and returns its current value. Prefer this over `useSignal` when the source is statically known to be `Computed<T>`, so type-checking enforces that only computed sources are passed.

### useDeepSignal

```tsx
function useDeepSignal<T extends object>(signal: DeepSignal<T>): T
```

Exposes a deep signal object for direct mutation within the component. Updates to nested properties trigger re-renders, and the subscription is cleaned up when the component unmounts.

### useMolecule

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

Mounts a molecule factory and returns its MoleculeInstance. The molecule's scope is bound to the component lifecycle: `onMount` callbacks run after the component mounts, and `onUnmount` callbacks run before it unmounts.

**Lifecycle Timing**

Molecule lifecycles are bound to React commits for precise timing control:

- In **browser environments**, molecule mounting happens synchronously after the component commits but before paint (via `useLayoutEffect`). This matches Vue 3's `onMounted` timing, ensuring consistent behavior across frameworks.
- In **SSR environments**, `useMolecule` supports both `renderToString` and streaming server rendering (`renderToPipeableStream`, `renderToReadableStream`). The molecule instance is created during render so components can read its state, but it is never mounted on the server.
- `onMount`, `watch`, and `watchEffect` registered during setup do not run during server rendering.
- After a **server render** finishes, the unmounted molecule instance is disposed automatically in a microtask so setup-scope `onDispose` cleanups do not leak across requests.

`onMount`, `watch`, and `watchEffect` run after the component commits. In the
browser, they run before paint.

**Props Handling**

`useMolecule` keeps the same molecule instance while the factory stays the same.
Molecules without props, and molecules whose props are all optional, can be
mounted without a props argument. Passing a props object directly creates an
initial snapshot. Passing a props getter requires a React dependency list, such
as `() => ({ open })` with `[open]`, and syncs top-level props only after those
dependencies change. This matches React's dependency model and avoids resyncing
referential props on every commit.

Inside a molecule, read props as `props.name`; destructuring copies the current
value and loses reactivity.

React components mount the root or controller molecule and use `useSignal()` to
read returned signals. Raw molecule events such as `dialog.on(...)` belong
inside the molecule graph, not in component bodies. If a UI wrapper needs a
React-controlled API such as `open` + `onOpenChange`, bridge it at the wrapper
boundary.

**Client Components and SSR**

`@sigrea/react` exports hooks and is intended for Client Components. Do not call
`useMolecule`, `useSignal`, `useComputed`, or `useDeepSignal` directly from a
React Server Component.

During server rendering, molecule instances can be created for the render pass,
but they are not mounted. `onMount`, `watch`, and `watchEffect` registered during
setup do not run on the server. After server rendering completes, unmounted
molecules are disposed in a microtask.

## Testing

```tsx
// tests/Counter.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { Counter } from "../components/Counter";

it("increments and displays the updated count", () => {
  render(<Counter initialCount={10} />);

  const incrementButton = screen.getByText("Increment");
  fireEvent.click(incrementButton);

  expect(screen.getByText("11")).toBeInTheDocument();
});
```

## Handling Scope Cleanup Errors

For global error handling configuration, see [@sigrea/core - Handling Scope Cleanup Errors](https://github.com/sigrea/core#handling-scope-cleanup-errors).

In React apps, configure the handler in your application entry point before rendering:

```tsx
// index.tsx or main.tsx
import { setScopeCleanupErrorHandler } from "@sigrea/core";
import { createRoot } from "react-dom/client";
import { App } from "./App";

setScopeCleanupErrorHandler((error, context) => {
  console.error(`Cleanup failed:`, error);

  // Forward to monitoring service
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

If you use mise:

- `mise trust -y` — trust `mise.toml` (first run only).
- `mise run ci` — run CI-equivalent checks locally.
- `mise run notes` — preview release notes (optional).

You can also run pnpm scripts directly:

- `pnpm install` — install dependencies.
- `pnpm test` — run the Vitest suite once (no watch).
- `pnpm typecheck` — run TypeScript type checking.
- `pnpm test:coverage` — collect coverage.
- `pnpm build` — compile via unbuild to produce dual CJS/ESM bundles.
- `pnpm cicheck` — run CI checks locally.
- `pnpm dev` — launch the playground counter demo.

See [CONTRIBUTING.md](./CONTRIBUTING.md) for workflow details.

## License

MIT — see [LICENSE](./LICENSE).
