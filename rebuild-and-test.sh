#!/bin/bash

# =============================================================================
# REBUILD AND TEST SCRIPT
# =============================================================================
# Quick script to rebuild the project and run tests

echo "🔧 Building the project..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please fix compilation errors first."
    exit 1
fi
