# @sigrea/react

`@sigrea/react` adapts [@sigrea/core](https://www.npmjs.com/package/@sigrea/core) molecule modules and signals for use in React components. It binds scope-aware lifecycles to `useEffect`, synchronizes signal subscriptions with React rendering, and provides hooks for both shallow and deep reactivity.

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

Requires React 18+ and Node.js 20 or later.

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
import { molecule, readonly, signal } from "@sigrea/core";
import { useMolecule, useSignal } from "@sigrea/react";

type CounterProps = {
  initialCount: number;
  initialStep: number;
};

const CounterMolecule = molecule((props: CounterProps) => {
  const count = signal(props.initialCount);
  const step = signal(props.initialStep);

  function setStep(next: number) {
    step.value = next;
  }

  function increment() {
    count.value += step.value;
  }

  function reset() {
    count.value = props.initialCount;
  }

  return {
    count: readonly(count),
    step: readonly(step),
    setStep,
    increment,
    reset,
  };
});

export function Counter(props: CounterProps) {
  const counter = useMolecule(CounterMolecule, props);
  const count = useSignal(counter.count);
  const step = useSignal(counter.step);

  return (
    <div>
      <span>{count}</span>
      <button onClick={counter.increment}>Increment</button>
      <button onClick={counter.reset}>Reset</button>
      <button onClick={() => counter.setStep(step + 1)}>Step +</button>
    </div>
  );
}
```

### Work with Deep Signals

```tsx
import { deepSignal } from "@sigrea/core";
import { useDeepSignal } from "@sigrea/react";

const form = deepSignal({ name: "Sigrea" });

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
function useSignal<T>(signal: Signal<T> | ReadonlySignal<T>): T
```

Subscribes to a signal or computed value and returns its current value. The component re-renders when the signal changes.

### useComputed

```tsx
function useComputed<T>(source: Computed<T>): T
```

Subscribes to a computed value and returns its current value. The component re-renders when the computed value changes, and the subscription is cleaned up when the component unmounts.

### useDeepSignal

```tsx
function useDeepSignal<T extends object>(signal: DeepSignal<T>): T
```

Exposes a deep signal object for direct mutation within the component. Updates to nested properties trigger re-renders, and the subscription is cleaned up when the component unmounts.

### useMolecule

```tsx
function useMolecule<TReturn extends object, TProps extends object | void = void>(
  molecule: MoleculeFactory<TReturn, TProps>,
  ...args: MoleculeArgs<TProps>
): MoleculeInstance<TReturn>
```

Mounts a molecule factory and returns its MoleculeInstance. The molecule's scope is bound to the component lifecycle: `onMount` callbacks run after the component mounts, and `onUnmount` callbacks run before it unmounts.

Props are treated as an initial snapshot. Updating component props does not recreate the molecule instance or update the snapshot; model dynamic values via signals or explicit molecule methods (for example, `setStep`).

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

This repo targets Node.js 20 or later.

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
