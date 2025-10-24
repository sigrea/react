# @sigrea/react

`@sigrea/react` adapts [@sigrea/core](https://www.npmjs.com/package/@sigrea/core) logic modules and signals so they can participate in React components. It wires scope-aware lifecycles to `useEffect`, keeps signal subscriptions aligned with React rendering, and surfaces ergonomic hooks for both shallow and deep reactivity.

## Installation

```bash
pnpm add @sigrea/react @sigrea/core react react-dom
```

React 18+ and Node.js 20+ are required. Equivalent npm or yarn commands work the same way.

## What This Adapter Provides

- **Signal readers** – `useSignal` streams signals and computed values into React components.
- **Deep signal access** – `useDeepSignal` exposes mutable deep signal objects with automatic teardown.
- **Derived state** – `useComputed` keeps derived values memoized per component instance.
- **Logic lifecycles** – `useLogic` mounts `defineLogic` factories and binds `onMount` / `onUnmount` to React’s lifecycle.
- **Snapshots** – `useSnapshot` provides low-level control when you need direct access to signal handlers.

## Quick Start

### Consume a signal

```tsx
import { signal } from "@sigrea/core";
import { useSignal } from "@sigrea/react";

const count = signal(0);

export function CounterLabel() {
	const value = useSignal(count);
	return <span>{value}</span>;
}
```

### Bridge framework-agnostic logic

```tsx
import { defineLogic, signal } from "@sigrea/core";
import { useLogic } from "@sigrea/react";

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

### Work with deep signals

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

## Testing

- `pnpm install` – install dependencies
- `pnpm test` – run the Vitest suite
- `pnpm build` – emit distributable artifacts
- `pnpm dev` – launch the playground counter demo

## License

MIT — see `LICENSE`.
