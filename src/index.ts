import "./globals"

import { Delaunay } from "d3-delaunay"

// import { promises as fs } from "fs"
import { Positionable } from "./models/positionable"
import { hba } from "./algorithms/hba"
import { Node } from "./models/node"

const sensingRange = 5

/** Create a list of nodes with random coordinates. If `howMany` is ≥ the square of `fieldSize`, it won't work, so don't do that. */
export function randomlyPlaceNodes(howMany = 28, fieldSize = 50) {
	function make(_: any, id: number) {
		return round({
			id,
			x: Math.random() * fieldSize,
			y: Math.random() * fieldSize
		})
	}

	// Let's ensure there are no two nodes that are overlapping each other.

	let nodes = Array.from({ length: howMany }).map(make)

	let containedDuplicates: boolean

	do {
		nodes.sort(sort)
		containedDuplicates = false

		for (let i = nodes.length - 1; i >= 0; i--) {
			const node = nodes[i]

			if (isUnique(node, i, nodes)) {
				continue
			}

			containedDuplicates = true
			nodes.splice(i, 1, make(undefined, node.id))
		}
	} while (containedDuplicates)

	// Return our list of unique nodes, sorted by ID, because why not

	return nodes.sort((lhs, rhs) => lhs.id - rhs.id)
}

export function mapCoordinates(pos: Positionable) {
	return [pos.x, pos.y]
}

export function getX(pos: Positionable | number[]) {
	return Array.isArray(pos) ? pos[0] : pos.x
}

export function getY(pos: Positionable | number[]) {
	return Array.isArray(pos) ? pos[1] : pos.y
}

export function sort(lhs: Positionable, rhs: Positionable): number
export function sort(lhs: number[], rhs: number[]): number
export function sort(lhs: Positionable | number[], rhs: Positionable | number[]) {
	return getX(lhs) - getX(rhs) || getY(lhs) - getY(rhs)
}

export function round<T extends Positionable | number[]>(pos: T): T
export function round(pos: Positionable | number[]) {
	return Array.isArray(pos)
		? pos.map(Math.round)
		: {
				...pos,
				x: Math.round(pos.x),
				y: Math.round(pos.y)
		  }
}

export function mapPairs(pair: number[]) {
	return {
		x: pair[0],
		y: pair[1]
	}
}

export function distanceBetween(a: Positionable, b: Positionable) {
	return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2))
}

export function isUnique(pos: Positionable, i: number, arr: Positionable[]) {
	const prev = arr[i - 1]

	return !prev || pos.x !== prev.x || pos.y !== prev.y
}

const staticNodes = randomlyPlaceNodes()
const delaunay = Delaunay.from(staticNodes.map(mapCoordinates))
const voronoi = delaunay.voronoi([0, 0, 50, 50])

const holes = Array.from(voronoi.cellPolygons())
	.flat()
	.map(mapPairs)
	.map(round)
	.sort(sort)
	.filter(isUnique)
	.filter((pos) => {
		return staticNodes.every((node) => distanceBetween(pos, node) > sensingRange)
	})
	.map((pos) => ({ ...pos, confidence: 0 }))

const mobileNodes = randomlyPlaceNodes()

console.log(mobileNodes)
console.log(holes)

const hbaResult = hba(mobileNodes, holes)

console.log(hbaResult)
