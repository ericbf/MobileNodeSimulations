import { Flatten } from "./helpers"

declare global {
	interface Array<T> {
		flat(levels?: 1): Flatten<T>
		flat(levels: 0): T[]
		flat(levels: 2): Flatten<Flatten<T>>
		flat(levels: 3): Flatten<Flatten<Flatten<T>>>
		flat<U>(levels: number): U[]

		flatMap<U>(callback: (currentValue: T, index: number, array: T[]) => U[]): U[]

		/** Removes any elements that equal the passed element from the array in place, and return the same array. */
		remove(element: T): T[]
	}
}

if (!Array.prototype.flat) {
	require("array.prototype.flat/auto")
}

if (!Array.prototype.flatMap) {
	require("array.prototype.flatmap/auto")
}

if (!Array.prototype.remove) {
	Object.defineProperty(Array.prototype, "remove", {
		value<T>(this: T[], element: T) {
			for (let i = this.length - 1; i >= 0; i--) {
				if (element === this[i]) {
					this.splice(i, 1)
				}
			}

			return this
		}
	})
}

export {}
