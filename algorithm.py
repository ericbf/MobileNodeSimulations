from sim2net.mobility._mobility import Mobility

from configuration import nodes_number, number_nodes_that_are_mobile, mapCoordinates, static_node_battery, Map, mobile_node_battery

class Algorithm(Mobility):
    def __init__(self):
        Mobility.__init__(self, "algorithm")

    def setup_environment(self):
        """
        Any initial setup to be done. This is run at the very beginning before the first round (before nodes are even initialized).
        """
        self.nodes = dict()
        self.time = 0

    def step(self):
        """
            Do a simulation step. Calculate any actions to be done, move nodes, reduce battery, etc. Call `sys.exit()` to exit the simulation (when the network is dead).
        """

    def get_current_position(self, node_id, node_speed, node_coordinates):
        if node_id == 0:
            if not hasattr(self, "time"):
                self.setup_environment()
            else:
                self.time += 1
                self.step()

        if self.time == 0:
            isMobile = node_id < number_nodes_that_are_mobile

            # Initialize the nodes
            self.nodes[node_id] = Map({
                "id": node_id,
                "speed": node_speed.current,
                "pos": mapCoordinates(node_coordinates),
                "battery": mobile_node_battery if isMobile else static_node_battery,
                "mobile": isMobile
            })

        node = self.nodes[node_id]

        # Update node positions
        return (node.pos.x, node.pos.y)