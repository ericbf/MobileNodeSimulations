import "./globals"

import { Delaunay } from "d3-delaunay"

// import { promises as fs } from "fs"
import { Positionable } from "./models/positionable"
import { hba } from "./algorithms/hba"

const sensingRange = 5

export function randomlyPlaceNodes(howMany = 28, fieldSize = 50) {
	return Array.from({ length: howMany }).map((_, i) => ({
		id: i,
		x: Math.random() * fieldSize,
		y: Math.random() * fieldSize
	}))
}

export function mapCoordinates(pos: Positionable) {
	return [pos.x, pos.y]
}

export function mapPairs(pair: [number, number] | number[]) {
	return {
		x: pair[0],
		y: pair[1]
	}
}

export function distanceBetween(a: Positionable, b: Positionable) {
	return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2))
}

const staticNodes = randomlyPlaceNodes()
const delaunay = Delaunay.from(staticNodes.map(mapCoordinates))
const voronoi = delaunay.voronoi([0, 0, 50, 50])

const holes = Array.from(voronoi.cellPolygons())
	.flat()
	.map(mapPairs)
	.sort((lhs, rhs) => lhs.x - rhs.x || lhs.y - rhs.y)
	.filter((pos, i, arr) => {
		const prev = arr[i - 1]

		return !prev || pos.x !== prev.x || pos.y !== prev.y
	})
	.filter((pos) => {
		return staticNodes.every((node) => distanceBetween(pos, node) > sensingRange)
	})
	.map((pos) => ({ ...pos, confidence: 0 }))

const mobileNodes = randomlyPlaceNodes()

console.log(mobileNodes)
console.log(holes)

const hbaResult = hba(mobileNodes, holes)

console.log(hbaResult)
