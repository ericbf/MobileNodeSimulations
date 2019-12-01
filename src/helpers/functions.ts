import { shouldRound, verbosity } from ".."
import { Position } from "../models/position"

/**
 * Get a cartesian pair from a position.
 * @param pos The position to convert to a cartesian pair.
 */
export function toCartesian(pos: Position) {
	return Array.isArray(pos) ? pos : [pos.x, pos.y]
}

/**
 * Get a coordinate object from a position.
 * @param pos The position to convert to a coordinate object.
 */
export function toCoordinate(pos: Position) {
	return Array.isArray(pos)
		? {
				x: pos[0],
				y: pos[1]
		  }
		: pos
}

/**
 * Get the `x` value of a position value.
 * @param pos The position from which to get the `x` value.
 */
export function getX(pos: Position) {
	return Array.isArray(pos) ? pos[0] : pos.x
}

/**
 * Get the `y` value of a position value.
 * @param pos The position from which to get the `y` value.
 */
export function getY(pos: Position) {
	return Array.isArray(pos) ? pos[1] : pos.y
}

/**
 * A sorter that will sort positions by `x` first, then by `y`.
 * @param lhs The first element in the comparison.
 * @param rhs The second element in the comparison.
 */
export function byPosition(lhs: Position, rhs: Position) {
	return getX(lhs) - getX(rhs) || getY(lhs) - getY(rhs)
}

/**
 * Return a rounded version of the passed position.
 * @param pos The position to round.
 */
export function round<T extends Position>(pos: T): T
export function round(pos: Position) {
	return shouldRound
		? Array.isArray(pos)
			? pos.map(Math.round)
			: {
					...pos,
					x: Math.round(pos.x),
					y: Math.round(pos.y)
			  }
		: pos
}

/**
 * Get the distance between two points in the cartesian plane.
 * @param a The first point in the comparison.
 * @param b The second point in the comparison.
 */
export function distanceBetween(a: Position, b: Position) {
	return Math.sqrt(Math.pow(getX(a) - getX(b), 2) + Math.pow(getY(a) - getY(b), 2))
}

/**
 * Whether the passed value is different from the value before it. You can pass this to a filter of a sorted array to filter out duplicates.
 * @param pos The element itself.
 * @param i The index of the element.
 * @param arr The array that is being checked.
 */
export function isUnique(pos: Position, i: number, arr: Position[]) {
	const prev = arr[i - 1]

	return !prev || getX(pos) !== getX(prev) || getY(pos) !== getY(prev)
}

/**
 * Get a transposed version of the passed matrix.
 * @param matrix The matrix to transpose.
 */
export function transposed(matrix: number[][]) {
	return matrix.map((_, i) => matrix.map((row) => row[i]))
}

/**
 * Perform a callback with a transposed version of the passed matrix, then re-transpose before returning.
 * @param matrix The matrix to transpose, pass to the callback, then re-transpose.
 * @param callback The callback to call with the transposed matrix.
 */
export function withTransposed(
	matrix: number[][],
	callback: (matrix: number[][]) => number[][]
) {
	return transposed(callback(transposed(matrix)))
}

/**
 * Get a better representation of the passed matrix, that is, get columns and rows showing with the right orientation.
 * @param matrix The matrix to stringify.
 */
export function stringify(matrix: number[][], precision = 1) {
	return transposed(matrix)
		.map((column) => {
			return column.map((value) => `${value.toFixed(precision)}`).join(`\t`)
		})
		.join(`\n`)
}

/** Return a version of the passed object which omits the properties with the passed keys. */
export function omit<T extends object, K extends keyof T>(obj: T, ...keys: K[]) {
	const ret = {} as { [P in Exclude<keyof T, K>]: T[P] }

	Object.keys(obj).forEach((k) => {
		if (!keys.includes(k as K)) {
			// tslint:disable-next-line: no-any
			ret[k as keyof typeof ret] = obj[k as K] as any
		}
	})

	return ret
}

/**
 * Write something to log if verbosity is set to debug.
 * @param args The args to write to log.
 */
export function debug(...args: any[]) {
	if (verbosity === "debug") {
		console.log(...args)
	}
}

/**
 * Write something to log if verbosity is set to info or debug.
 * @param args The args to write to log.
 */
export function info(...args: any[]) {
	if (verbosity === "debug" || verbosity === "info") {
		console.log(...args)
	}
}
