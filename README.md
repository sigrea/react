# @sigrea/react

`@sigrea/react` adapts [@sigrea/core](https://www.npmjs.com/package/@sigrea/core) logic modules and signals for use in React components. It binds scope-aware lifecycles to `useEffect`, synchronizes signal subscriptions with React rendering, and provides hooks for both shallow and deep reactivity.

- **Signal subscriptions.** `useSignal` subscribes to signals and computed values, triggering re-renders when they change.
- **Computed subscriptions.** `useComputed` subscribes to computed values and memoizes them per component instance.
- **Deep signal subscriptions.** `useDeepSignal` subscribes to deep signal objects and exposes them for direct mutation.
- **Logic lifecycles.** `useLogic` mounts logic factories and binds their lifecycles to React components.

## Table of Contents

- [Install](#install)
- [Quick Start](#quick-start)
  - [Consume a Signal](#consume-a-signal)
  - [Bridge Framework-Agnostic Logic](#bridge-framework-agnostic-logic)
  - [Work with Deep Signals](#work-with-deep-signals)
- [API Reference](#api-reference)
  - [useSignal](#usesignal)
  - [useComputed](#usecomputed)
  - [useDeepSignal](#usedeepsignal)
  - [useLogic](#uselogic)
- [Testing](#testing)
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

### Bridge Framework-Agnostic Logic

```tsx
import { defineLogic, signal } from "@sigrea/core";
import { useLogic, useSignal } from "@sigrea/react";

const CounterLogic = defineLogic<{ initialCount: number }>()((props) => {
  const count = signal(props.initialCount);

  const increment = () => {
    count.value += 1;
  };

  const reset = () => {
    count.value = props.initialCount;
  };

  return { count, increment, reset };
});

export function Counter(props: { initialCount: number }) {
  const counter = useLogic(CounterLogic, props);
  const value = useSignal(counter.count);

  return (
    <div>
      <span>{value}</span>
      <button onClick={counter.increment}>Increment</button>
      <button onClick={counter.reset}>Reset</button>
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

### useLogic

```tsx
function useLogic<TProps, TReturn>(
  logic: LogicFunction<TProps, TReturn>,
  props?: TProps
): TReturn
```

Mounts a logic factory and returns its public API. The logic's scope is bound to the component lifecycle: `onMount` callbacks run after the component mounts, and `onUnmount` callbacks run before it unmounts.

## Testing

```tsx
// tests/Counter.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { cleanupLogics } from "@sigrea/core";
import { Counter } from "../components/Counter";

afterEach(() => cleanupLogics());

it("increments and displays the updated count", () => {
  render(<Counter initialCount={10} />);

  const incrementButton = screen.getByText("Increment");
  fireEvent.click(incrementButton);

  expect(screen.getByText("11")).toBeInTheDocument();
});
```

## Development

Development scripts prefer pnpm. npm or yarn work too, but pnpm keeps dependency resolution identical to CI.

- `pnpm install` — install dependencies.
- `pnpm test` — run the Vitest suite once (no watch).
- `pnpm build` — compile via unbuild to produce dual CJS/ESM bundles.
- `pnpm dev` — launch the playground counter demo.

## License

MIT — see [LICENSE](./LICENSE).
