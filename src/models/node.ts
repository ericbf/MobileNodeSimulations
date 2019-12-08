import { Coordinate } from "./position"

export interface Node extends Coordinate {
	id: number
	battery: number
}
