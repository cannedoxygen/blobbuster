#!/bin/bash

# Load environment variables from root .env file
if [ -f "../../.env" ]; then
  export $(cat ../../.env | grep -v '^#' | xargs)
fi

# Start the development server
npm run dev
