import math
from collections import deque

def angle_3d(a, b, c):
    ba = [a.x - b.x, a.y - b.y, a.z - b.z]
    bc = [c.x - b.x, c.y - b.y, c.z - b.z]
    dot = sum(ba[i] * bc[i] for i in range(3))
    mag_ba = math.sqrt(sum(x**2 for x in ba))
    mag_bc = math.sqrt(sum(x**2 for x in bc))
    if mag_ba == 0 or mag_bc == 0:
        return 0
    cos_angle = max(min(dot / (mag_ba * mag_bc), 1), -1)
    return math.degrees(math.acos(cos_angle))

def avg(*values):
    return sum(values) / len(values)

class ValueSmoother:
    def __init__(self, window_size=3):
        self.values = deque(maxlen=window_size)
    
    def add(self, value):
        self.values.append(value)
        return sum(self.values) / len(self.values)
    
    def clear(self):
        self.values.clear()
