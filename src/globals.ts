declare global {
	interface Array<T> {
		flat(levels?: 1): Flatten<T>
		flat(levels: 0): T[]
		flat(levels: 2): Flatten<Flatten<T>>
		flat(levels: 3): Flatten<Flatten<Flatten<T>>>
		flat<U>(levels: number): U[]
		flatMap<U>(callback: (currentValue: T, index: number, array: T[]) => U[]): U[]
	}
}

if (!Array.prototype.flat) {
	require("array.prototype.flat/auto")
}

if (!Array.prototype.flatMap) {
	require("array.prototype.flatmap/auto")
}

export type Flatten<T> = T extends Array<infer U> ? U[] : T[]

export {}
