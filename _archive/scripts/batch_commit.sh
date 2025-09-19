#!/bin/bash

BATCH_SIZE=200

while true; do
  # Get list of unstaged files, max $BATCH_SIZE
  files=$(git status -s | awk '{print $2}' | head -n $BATCH_SIZE)
  
  # If no files left, exit loop
  if [ -z "$files" ]; then
    echo "All changes committed!"
    break
  fi

  # Add files to staging
  git add $files

  # Commit with a generic message and timestamp
  git commit -m "Batch commit of $(echo "$files" | wc -l) files on $(date '+%Y-%m-%d %H:%M:%S')"

done
