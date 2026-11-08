"""forge.decals with a wider scale search: a jump or fall pose is drawn smaller than the idle reference.

    FORGE_PROJECT=art PYTHONPATH=~/projects/sprite-forge ~/projects/sprite-forge/.venv/bin/python art/paper/decals.py characters/NAME/decals.toml
"""
import sys

import numpy as np
from forge import decals

decals.SCALE = (0.72, 0.78, 0.84, 0.9, 0.96, 1.0, 1.04, 1.1)
decals.SPIN = np.arange(-24, 25, 4.0)
decals.main(sys.argv[1])
