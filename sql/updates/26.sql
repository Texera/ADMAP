/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

\c texera_db

SET search_path TO texera_db;

BEGIN;

-- Adds the dataset_contributor table (and its role enum), used to persist the
-- list of contributors associated with a dataset.

DO $$ BEGIN
    CREATE TYPE contributor_role_enum AS ENUM ('RESEARCHER', 'PRINCIPAL INVESTIGATOR', 'PROJECT MEMBER', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS dataset_contributor
(
    cid               SERIAL PRIMARY KEY,
    did               INT NOT NULL,
    name              VARCHAR(256) NOT NULL,
    creator           BOOLEAN NOT NULL DEFAULT FALSE,
    role              contributor_role_enum,
    email             VARCHAR(256),
    affiliation       VARCHAR(256),
    FOREIGN KEY (did) REFERENCES dataset(did) ON DELETE CASCADE
);

COMMIT;
