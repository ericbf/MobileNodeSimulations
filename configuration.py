# -*- coding: utf-8 -*


# For bug reports, feature and support requests please visit
# <https://github.com/mkalewski/sim2net/issues>.

"""
sim2net -- simulation configuration file.

If in any doubt, refer to the technical documentations that is available on the
Internet:  <https://sim2net.readthedocs.org/en/latest/>.
"""

from sim2net.area.rectangle import Rectangle
from sim2net.area.square import Square
from sim2net.failure.crash import Crash
from sim2net.packet_loss.gilbert_elliott import GilbertElliott
from sim2net.placement.grid import Grid as PlacementGrid
from sim2net.placement.normal import Normal as PlacementNormal
from sim2net.placement.uniform import Uniform as PlacementUniform
from sim2net.propagation.path_loss import PathLoss
from sim2net.speed.constant import Constant as SpeedConstant
from sim2net.speed.normal import Normal as SpeedNormal
from sim2net.speed.uniform import Uniform as SpeedUniform

## EDIT BELOW -----------------------------------------------------------------

## Number of stuffs
nodes_number = 200
number_nodes_that_are_mobile = 100
static_node_battery = 100
mobile_node_battery = 1000

## Range settings
communication_range = 150.0
sensing_range = 50.0
confidence_threshold = 0.8

## Field of interest settings
area = [Square, {'side': 500.0}]
placement = [PlacementNormal, {'standard_deviation': 150.0}]
coverage_requirement = 0.8
speed = [SpeedConstant, {'speed': 1.0}]

## Other stuff – no need to edit
transmission_range = 0.1
logger_level = 'warning' # 'critical', 'error', 'warning', 'info', or 'debug'
simulation_frequency = 1
total_simulation_steps = 1000000
propagation = [PathLoss]
packet_loss = [GilbertElliott, {'prhk': None}]
maximum_transmission_time = 0.125
failure = [Crash, {'crash_probability': 0.0, 'maximum_crash_number': 0, 'transient_steps': 0}]

## Some helpers

class Map(dict):
    def __init__(self, *args, **kwargs):
        super(Map, self).__init__(*args, **kwargs)
        for arg in args:
            if isinstance(arg, dict):
                for k, v in arg.iteritems():
                    self[k] = v

        if kwargs:
            for k, v in kwargs.iteritems():
                self[k] = v

    def __getattr__(self, key):
        return self.__getitem__(key)

    def __setattr__(self, key, value):
        self.__setitem__(key, value)

    def __setitem__(self, key, value):
        super(Map, self).__setitem__(key, value)
        self.__dict__.update({key: value})

    def __delattr__(self, item):
        self.__delitem__(item)

    def __delitem__(self, key):
        super(Map, self).__delitem__(key)
        del self.__dict__[key]

def mapCoordinates(coordinates):
    return Map({
        "x": coordinates[0],
        "y": coordinates[1]
    })