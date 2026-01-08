#!/bin/bash

# Python doesn't need explicit compilation step for our purpose, 
# but we can check syntax if we wanted to. 
# We'll just run it.

if [ -f input.txt ]; then
    timeout 5s python3 Main.py < input.txt
else
    timeout 5s python3 Main.py
fi