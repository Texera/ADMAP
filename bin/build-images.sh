#!/bin/bash
# Licensed to the Apache Software Foundation (ASF) under one
# or more contributor license agreements.  See the NOTICE file
# distributed with this work for additional information
# regarding copyright ownership.  The ASF licenses this file
# to you under the Apache License, Version 2.0 (the
# "License"); you may not use this file except in compliance
# with the License.  You may obtain a copy of the License at
#
#   http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing,
# software distributed under the License is distributed on an
# "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
# KIND, either express or implied.  See the License for the
# specific language governing permissions and limitations
# under the License.

set -e

SERVICES_INPUT="${SERVICES_INPUT:-*}"

# Convert the user input into an array for easy lookup
IFS=',' read -ra SELECTED_SERVICES <<< "$SERVICES_INPUT"

# Helper to determine whether a given service should be built
should_build() {
  local svc="$1"
  # Build everything if the user specified '*'
  if [[ "$SERVICES_INPUT" == "*" ]]; then
    return 0
  fi
  for sel in "${SELECTED_SERVICES[@]}"; do
    # Trim possible whitespace around each token
    sel="$(echo -e "${sel}" | tr -d '[:space:]')"
    if [[ "$svc" == "$sel" ]]; then
      return 0
    fi
  done
  return 1
}

PLATFORM="linux/amd64"
FULL_TAG="admap-amd64"
REGISTRY="texera"

# JOOQ codegen runs during `sbt` inside the build container and needs a
# reachable Postgres. Override via env for other environments, e.g. a local
# docker-compose-based build would set STORAGE_JDBC_URL=jdbc:postgresql://host.docker.internal:5432/...
STORAGE_JDBC_URL="${STORAGE_JDBC_URL:-jdbc:postgresql://texera-postgresql.texera.svc.cluster.local:5432/texera_db?currentSchema=texera_db,public}"
STORAGE_JDBC_USERNAME="${STORAGE_JDBC_USERNAME:-postgres}"
# Postgres password is passed via a BuildKit secret mount (never lands in env
# or argv). Point PGPW_FILE at a file containing just the password.
PGPW_FILE="${PGPW_FILE:-}"

# Ensure Buildx is ready
# Define builder name (override via env var, e.g. BUILDER_NAME=texera-k8s-builder for in-cluster builds)
BUILDER_NAME="${BUILDER_NAME:-texera-builder}"

# Check if builder exists
if ! docker buildx inspect "$BUILDER_NAME" > /dev/null 2>&1; then
    echo "Creating new builder: $BUILDER_NAME"
    docker buildx create --name "$BUILDER_NAME" --use --bootstrap
else
    echo "Using existing builder: $BUILDER_NAME"
    # Try to use it; if it fails (due to corruption), remove and recreate
    if ! docker buildx use "$BUILDER_NAME" 2>/dev/null; then
        echo "⚠️  Builder corrupted. Recreating..."
        docker buildx rm "$BUILDER_NAME" --force
        docker buildx create --name "$BUILDER_NAME" --use --bootstrap
    fi
fi

cd "$(dirname "$0")"

# Auto-detect Dockerfiles in current directory
dockerfiles=( *.dockerfile )

if [[ ${#dockerfiles[@]} -eq 0 ]]; then
  echo "❌ No Dockerfiles found (*.dockerfile) in the current directory."
  exit 1
fi

echo "🔨 Building and pushing Texera images for $PLATFORM..."

for dockerfile in "${dockerfiles[@]}"; do
  service_name=$(basename "$dockerfile" .dockerfile)

  # Skip services the user did not ask for
  if ! should_build "$service_name"; then
    echo "⏭️  Skipping $service_name"
    continue
  fi

  image="$REGISTRY/$service_name:$FULL_TAG"

  echo "👉 Building $image from $dockerfile"

  secret_args=()
  if [[ -n "$PGPW_FILE" && -s "$PGPW_FILE" ]]; then
    secret_args=(--secret "id=pgpw,src=$PGPW_FILE")
  fi

  docker buildx build \
    --platform "$PLATFORM" \
    -f "$dockerfile" \
    -t "$image" \
    --build-arg "STORAGE_JDBC_URL=$STORAGE_JDBC_URL" \
    --build-arg "STORAGE_JDBC_USERNAME=$STORAGE_JDBC_USERNAME" \
    "${secret_args[@]}" \
    --push \
    ..
done

echo "✅ All images built and pushed with tag :$FULL_TAG"
