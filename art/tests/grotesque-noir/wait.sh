#!/bin/bash
# exits when both gn jobs have finished
until [ -f /mnt/data/sprite-forge/runs/grotesque-noir/run2/qwen-edit/cust_F/2.png ] && [ -f /mnt/data/sprite-forge/runs/grotesque-noir/run2/klein/cust_F/2.png ]; do sleep 20; done
