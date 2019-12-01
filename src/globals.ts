import { Flatten } from "./helpers"

declare global {
	interface Array<T> {
		random: T
		first: T
		last: T

		flat(levels?: 1): Flatten<T>
		flat(levels: 0): T[]
		flat(levels: 2): Flatten<Flatten<T>>
		flat(levels: 3): Flatten<Flatten<Flatten<T>>>
		flat<U>(levels: number): U[]

		flatMap<U>(callback: (currentValue: T, index: number, array: T[]) => U[]): U[]

		/** Removes any elements that equal the passed element from the array in place, and return removed elements. */
		remove(element: T): T[]
	}

	interface ObjectConstructor {
		entries<T, K extends keyof T>(obj: T): [string, T[K]][]
		keys<T, K extends keyof T>(obj: T): K[]
		values<T, K extends keyof T>(obj: T): T[K][]
	}
}

if (!Array.prototype.flat) {
	require("array.prototype.flat/auto")
}

if (!Array.prototype.flatMap) {
	require("array.prototype.flatmap/auto")
}

if (!Array.prototype.first) {
	Object.defineProperty(Array.prototype, "first", {
		get<T>(this: T[]) {
			return this[0]
		},
		set<T>(this: T[], newValue: T) {
			return (this[0] = newValue)
		}
	})
}

if (!Array.prototype.last) {
	Object.defineProperty(Array.prototype, "last", {
		get<T>(this: T[]) {
			return this[Math.max(this.length - 1, 0)]
		},
		set<T>(this: T[], newValue: T) {
			return (this[Math.max(this.length - 1, 0)] = newValue)
		}
	})
}

if (!Array.prototype.random) {
	Object.defineProperty(Array.prototype, "random", {
		get<T>(this: T[]) {
			return this[Math.floor(Math.random() * this.length)]
		},
		set<T>(this: T[], newValue: T) {
			return (this[Math.floor(Math.random() * this.length)] = newValue)
		}
	})
}

if (!Array.prototype.remove) {
	Object.defineProperty(Array.prototype, "remove", {
		value<T>(this: T[], element: T) {
			let removed: T[] = []

			for (let i = this.length - 1; i >= 0; i--) {
				if (element === this[i]) {
					removed.push(...this.splice(i, 1))
				}
			}

			return removed
		}
	})
}

export {}
