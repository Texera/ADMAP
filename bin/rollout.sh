#!/bin/bash

# 1. Trigger a rolling restart for ALL deployments in the namespace
echo "🚀 Triggering rollout restart for all deployments in 'texera'..."
kubectl rollout restart deployment -n texera

# 2. Wait for the rollout to complete (Optional, but good for CI/CD)
# echo "⏳ Waiting for rollouts to complete..."
# kubectl rollout status deployment -n texera

# 3. Watch the pods recreate to verify they are pulling new images
echo "👀 Watching pods restart (Ctrl+C to exit)..."
kubectl get pods -n texera -w
