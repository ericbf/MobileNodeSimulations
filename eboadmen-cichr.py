#!/usr/bin/env python
# -*- coding: utf-8 -*-


# For bug reports, feature and support requests please visit
# <https://github.com/mkalewski/sim2net/issues>.

"""
sim2net -- simulation application file.

If in any doubt, refer to the technical documentations that is available on the
Internet:  <https://sim2net.readthedocs.org/en/latest/>.
"""

from sim2net.application import Application
from sim2net.mobility._mobility import Mobility

class EBOADMEN_CICHR(Mobility):
    def __init__(self, number_nodes, number_mobile_nodes):
        Mobility.__init__(self, "EBOADMEN-CICHR")

        print("%d and %d" % (number_nodes, number_mobile_nodes))

    def get_current_position(self, node_id, node_speed, node_coordinates):
        return node_coordinates

class Node(Application):
    def initialize(self, node_id, shared):
        """
        Initialization method.
        """
        self.node_id = node_id

    def finalize(self, shared):
        """
        Finalization method.
        """

    def failure(self, time, shared):
        """
        This method is called only if the node crashes.
        """

    def main(self, time, communication, neighbors, shared):
        """
        This method is called at each simulation step.
        """
        if self.node_id == 0 and time[0] == 1:
            communication.send('Hello World!')
        while True:
            msg = communication.receive()
            if msg is None:
                break
            print ('[node %d] message from node %d: "%s"'
                   % (self.node_id, msg[0], msg[1]))

execfile("./configuration.py")

# pylint:disable=undefined-variable,used-before-assignment
nodes_number = nodes_number
# pylint:disable=undefined-variable,used-before-assignment
mobile_nodes_number = mobile_nodes_number

## mobility
mobility = [EBOADMEN_CICHR, {'number_nodes': nodes_number, 'number_mobile_nodes': mobile_nodes_number}]
