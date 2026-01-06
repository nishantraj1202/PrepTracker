#!/bin/bash

# Compile
g++ Main.cpp -O2 -o main
COMPILE_EXIT_CODE=$?

if [ $COMPILE_EXIT_CODE -ne 0 ]; then
  echo "Compilation Error"
  exit 1
fi

# Run with timeout (using timeout command from coreutils)
# Input is fed from input.txt if it exists
if [ -f input.txt ]; then
    timeout 5s ./main < input.txt
else
    timeout 5s ./main
fi
