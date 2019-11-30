import { shouldRound } from ".."
import { Position } from "../models/position"

export function toCartesian(pos: Position) {
	return Array.isArray(pos) ? pos : [pos.x, pos.y]
}

export function toCoordinate(pos: Position) {
	return Array.isArray(pos)
		? {
				x: pos[0],
				y: pos[1]
		  }
		: pos
}

export function getX(pos: Position) {
	return Array.isArray(pos) ? pos[0] : pos.x
}

export function getY(pos: Position) {
	return Array.isArray(pos) ? pos[1] : pos.y
}

export function sort(lhs: Position, rhs: Position) {
	return getX(lhs) - getX(rhs) || getY(lhs) - getY(rhs)
}

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

export function distanceBetween(a: Position, b: Position) {
	return Math.sqrt(Math.pow(getX(a) - getX(b), 2) + Math.pow(getY(a) - getY(b), 2))
}

export function isUnique(pos: Position, i: number, arr: Position[]) {
	const prev = arr[i - 1]

	return !prev || getX(pos) !== getX(prev) || getY(pos) !== getY(prev)
}
