#!/bin/bash

# Compile
javac Main.java
COMPILE_EXIT_CODE=$?

if [ $COMPILE_EXIT_CODE -ne 0 ]; then
  echo "Compilation Error"
  exit 1
fi

# Run
if [ -f input.txt ]; then
    timeout 5s java Main < input.txt
else
    timeout 5s java Main
fi
