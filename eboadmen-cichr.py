#!/usr/bin/env python

import sys
import random

from algorithm import Algorithm

from configuration import number_nodes_that_are_mobile, mapCoordinates, static_node_battery, Map

class EBOADMEN_CICHR(Algorithm):
    def step(self):
        """
            Do a simulation step. Calculate any actions to be done, move nodes, reduce battery, etc. Call `sys.exit()` to exit the simulation (when the network is dead).
        """
        for node in self.nodes.values():
            node.battery = max(0, node.battery - random.random())

            if node.battery == 0:
                print "Quitting at time %d because of %s" % (self.time, node)

                sys.exit()

execfile("./configuration.py")

mobility = [EBOADMEN_CICHR]