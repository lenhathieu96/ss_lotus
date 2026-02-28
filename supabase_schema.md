# Supabase Database Schema — SS Lotus

## Overview

Normalized PostgreSQL schema replacing Firestore `tdhp` collection + Algolia search. All primary keys are UUID.

```
pagodas 1──N households 1──N families 1──N members
            │
            └── household_counters (1:1 per pagoda, tracks last household_number)
```

---

## Extensions & Enums

```sql
CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE TYPE period_enum AS ENUM ('morning', 'afternoon', 'night', 'unknown');
CREATE TYPE appointment_type_enum AS ENUM ('ca', 'cs');
```

---

## Tables

### pagodas

Each pagoda manages its own set of households with an independent numbering sequence.

```sql
CREATE TABLE pagodas (
    id          UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT            NOT NULL,
    address     TEXT,
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ     NOT NULL DEFAULT now(),

    CONSTRAINT name_not_empty CHECK (trim(name) <> '')
);
```

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | Auto-generated |
| `name` | TEXT | Pagoda name, required |
| `address` | TEXT | Pagoda address (optional) |

---

### household_counters

Tracks the last assigned household number per pagoda. Replaces Firestore `counters/tdhp` document — one counter per pagoda.

```sql
CREATE TABLE household_counters (
    pagoda_id   UUID            PRIMARY KEY REFERENCES pagodas(id) ON DELETE CASCADE,
    last_number INTEGER         NOT NULL DEFAULT 0,
    updated_at  TIMESTAMPTZ     NOT NULL DEFAULT now(),

    CONSTRAINT last_number_range CHECK (last_number >= 0 AND last_number <= 9999)
);
```

| Column | Type | Notes |
|---|---|---|
| `pagoda_id` | UUID PK/FK | One counter per pagoda |
| `last_number` | INTEGER | Last assigned household number within this pagoda (0 = none yet) |

---

### households

Replaces top-level fields of each Firestore `tdhp/{id}` document. Appointment is inlined (1:1 relationship). `household_number` is the user-facing business key, unique within its pagoda.

```sql
CREATE TABLE households (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    pagoda_id           UUID            NOT NULL REFERENCES pagodas(id) ON DELETE CASCADE,
    household_number    INTEGER         NOT NULL,
    old_number          INTEGER,
    appt_date           DATE,
    appt_period         period_enum,
    appt_type           appointment_type_enum,
    search_vector       tsvector,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),

    CONSTRAINT household_number_range CHECK (household_number >= 1 AND household_number <= 9999),
    CONSTRAINT old_number_range CHECK (old_number IS NULL OR (old_number >= 1 AND old_number <= 9999)),
    CONSTRAINT uq_pagoda_household_number UNIQUE (pagoda_id, household_number),
    CONSTRAINT uq_pagoda_old_number UNIQUE (pagoda_id, old_number),
    CONSTRAINT appt_all_or_nothing CHECK (
        (appt_date IS NULL AND appt_period IS NULL AND appt_type IS NULL) OR
        (appt_date IS NOT NULL AND appt_period IS NOT NULL AND appt_type IS NOT NULL)
    )
);
```

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | Auto-generated surrogate key |
| `pagoda_id` | UUID FK | Which pagoda this household belongs to |
| `household_number` | INTEGER | Business key shown to users, 1-4 digits, unique per pagoda |
| `old_number` | INTEGER | Legacy number from previous system (optional, unique per pagoda) |
| `appt_date` | DATE | Appointment solar date (nullable) |
| `appt_period` | period_enum | morning / afternoon / night / unknown |
| `appt_type` | appointment_type_enum | ca / cs |
| `search_vector` | tsvector | Auto-maintained by triggers for full-text search |

---

### families

Replaces `families[]` array inside each Firestore document. One row per `UserGroup`.

```sql
CREATE TABLE families (
    id                          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id                UUID        NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    origin_household_number     INTEGER     NOT NULL,
    address                     TEXT        NOT NULL,
    family_position             SMALLINT    NOT NULL DEFAULT 0,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT origin_hh_number_range CHECK (origin_household_number >= 1 AND origin_household_number <= 9999),
    CONSTRAINT address_not_empty CHECK (trim(address) <> ''),
    CONSTRAINT uq_household_origin UNIQUE (household_id, origin_household_number),
    CONSTRAINT uq_household_family_position UNIQUE (household_id, family_position)
);
```

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | Auto-generated surrogate key |
| `household_id` | UUID FK | Current parent household |
| `origin_household_number` | INTEGER | `Family.id` in Dart — the household number this family originated from. Preserved across split/combine |
| `address` | TEXT | Stored UPPERCASE, required non-empty |
| `family_position` | SMALLINT | Display order within household (0-based) |

**Constraints:**
- `uq_household_origin` — same origin number cannot appear twice in one household (enforces combine duplicate check)
- `uq_household_family_position` — no two families at same position within a household

---

### members

Replaces `members[]` array inside each family. One row per `User` (phật tử).

```sql
CREATE TABLE members (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id       UUID            NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    full_name       TEXT            NOT NULL,
    christian_name  TEXT,
    yob             SMALLINT,
    position        SMALLINT        NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),

    CONSTRAINT full_name_not_empty CHECK (trim(full_name) <> ''),
    CONSTRAINT christian_name_not_empty CHECK (christian_name IS NULL OR trim(christian_name) <> ''),
    CONSTRAINT yob_range CHECK (yob IS NULL OR (yob >= 1900 AND yob <= 2100)),
    CONSTRAINT uq_family_member_position UNIQUE (family_id, position)
);
```

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | Auto-generated surrogate key |
| `family_id` | UUID FK | Parent family |
| `full_name` | TEXT | Required, stored UPPERCASE |
| `christian_name` | TEXT | Dharma name (pháp danh), optional, UPPERCASE |
| `yob` | SMALLINT | Year of birth, optional |
| `position` | SMALLINT | Display order within family (0-based, supports drag reorder) |

---

## Indexes

```sql
CREATE INDEX idx_households_pagoda ON households (pagoda_id);
CREATE INDEX idx_households_search_vector ON households USING GIN (search_vector);
CREATE INDEX idx_households_old_number ON households (pagoda_id, old_number) WHERE old_number IS NOT NULL;
CREATE INDEX idx_households_appt_date ON households (appt_date) WHERE appt_date IS NOT NULL;
CREATE INDEX idx_families_household ON families (household_id);
CREATE INDEX idx_members_family_position ON members (family_id, position);
```

---

## Full-Text Search

Replaces both Firestore `searchKeywords` field and Algolia. Trigger-maintained `tsvector` on `households` table.

### Rebuild function

```sql
CREATE OR REPLACE FUNCTION fn_rebuild_household_search_vector(p_household_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE v_vector tsvector;
BEGIN
    SELECT
        to_tsvector('simple', h.household_number::text)
        || COALESCE(to_tsvector('simple', h.old_number::text), ''::tsvector)
        || COALESCE(to_tsvector('simple', unaccent(string_agg(DISTINCT f.address, ' '))), ''::tsvector)
        || COALESCE(to_tsvector('simple', unaccent(string_agg(m.full_name, ' '))), ''::tsvector)
    INTO v_vector
    FROM households h
    LEFT JOIN families f ON f.household_id = h.id
    LEFT JOIN members m ON m.family_id = f.id
    WHERE h.id = p_household_id
    GROUP BY h.id, h.household_number, h.old_number;

    UPDATE households
    SET search_vector = COALESCE(v_vector, ''::tsvector), updated_at = now()
    WHERE id = p_household_id;
END; $$;
```

### Triggers

```sql
-- On households INSERT/UPDATE
CREATE OR REPLACE FUNCTION fn_households_search_trigger()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    PERFORM fn_rebuild_household_search_vector(NEW.id);
    RETURN NEW;
END; $$;

CREATE TRIGGER trg_households_search
    AFTER INSERT OR UPDATE OF household_number, old_number ON households
    FOR EACH ROW EXECUTE FUNCTION fn_households_search_trigger();

-- On families INSERT/UPDATE/DELETE
CREATE OR REPLACE FUNCTION fn_families_search_trigger()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN
        PERFORM fn_rebuild_household_search_vector(OLD.household_id);
    END IF;
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        PERFORM fn_rebuild_household_search_vector(NEW.household_id);
    END IF;
    RETURN COALESCE(NEW, OLD);
END; $$;

CREATE TRIGGER trg_families_search
    AFTER INSERT OR UPDATE OF household_id, address OR DELETE ON families
    FOR EACH ROW EXECUTE FUNCTION fn_families_search_trigger();

-- On members INSERT/UPDATE/DELETE
CREATE OR REPLACE FUNCTION fn_members_search_trigger()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_hh_id UUID;
BEGIN
    IF TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN
        SELECT household_id INTO v_hh_id FROM families WHERE id = OLD.family_id;
        PERFORM fn_rebuild_household_search_vector(v_hh_id);
    END IF;
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        SELECT household_id INTO v_hh_id FROM families WHERE id = NEW.family_id;
        PERFORM fn_rebuild_household_search_vector(v_hh_id);
    END IF;
    RETURN COALESCE(NEW, OLD);
END; $$;

CREATE TRIGGER trg_members_search
    AFTER INSERT OR UPDATE OF family_id, full_name OR DELETE ON members
    FOR EACH ROW EXECUTE FUNCTION fn_members_search_trigger();
```

### Query examples

```sql
-- Single word within a pagoda
SELECT * FROM households
WHERE pagoda_id = 'some-uuid'
  AND search_vector @@ to_tsquery('simple', unaccent('nguyễn'))
LIMIT 50;

-- Multi-word (AND) within a pagoda
SELECT * FROM households
WHERE pagoda_id = 'some-uuid'
  AND search_vector @@ to_tsquery('simple', unaccent('nguyễn') || ' & ' || unaccent('văn'))
LIMIT 50;
```

---

## Atomic Operation Functions

### Get next household number (peek, no claim)

```sql
CREATE OR REPLACE FUNCTION fn_get_next_household_number(p_pagoda_id UUID)
RETURNS INTEGER LANGUAGE sql STABLE AS $$
    SELECT COALESCE(last_number, 0) + 1
    FROM household_counters
    WHERE pagoda_id = p_pagoda_id;
$$;
```

### Create household with auto-number

Atomically claims the next number from `household_counters` for the given pagoda, then inserts household + families + members.

```sql
CREATE OR REPLACE FUNCTION fn_create_household_auto_number(p_pagoda_id UUID, json_payload JSONB)
RETURNS JSONB LANGUAGE plpgsql AS $$
DECLARE
    v_number INTEGER; v_hh_id UUID; v_family JSONB; v_member JSONB;
    v_family_id UUID; v_fam_idx INTEGER; v_mem_idx INTEGER;
BEGIN
    -- Atomic counter increment (row lock prevents races)
    UPDATE household_counters
    SET last_number = last_number + 1, updated_at = now()
    WHERE pagoda_id = p_pagoda_id
    RETURNING last_number INTO v_number;

    IF v_number IS NULL THEN RAISE EXCEPTION 'No counter found for pagoda %', p_pagoda_id; END IF;
    IF v_number > 9999 THEN RAISE EXCEPTION 'Household number exhausted (max 9999) for pagoda %', p_pagoda_id; END IF;

    -- Insert household
    INSERT INTO households (pagoda_id, household_number, old_number, appt_date, appt_period, appt_type)
    VALUES (p_pagoda_id, v_number,
            (json_payload->>'old_number')::INTEGER,
            (json_payload->>'appt_date')::DATE,
            (json_payload->>'appt_period')::period_enum,
            (json_payload->>'appt_type')::appointment_type_enum)
    RETURNING id INTO v_hh_id;

    -- Insert families and members
    v_fam_idx := 0;
    FOR v_family IN SELECT * FROM jsonb_array_elements(json_payload->'families') LOOP
        INSERT INTO families (household_id, origin_household_number, address, family_position)
        VALUES (v_hh_id, v_number, upper(v_family->>'address'), v_fam_idx)
        RETURNING id INTO v_family_id;

        v_mem_idx := 0;
        FOR v_member IN SELECT * FROM jsonb_array_elements(v_family->'members') LOOP
            INSERT INTO members (family_id, full_name, christian_name, yob, position)
            VALUES (v_family_id, upper(v_member->>'full_name'),
                    upper(v_member->>'christian_name'),
                    (v_member->>'yob')::SMALLINT, v_mem_idx);
            v_mem_idx := v_mem_idx + 1;
        END LOOP;
        v_fam_idx := v_fam_idx + 1;
    END LOOP;

    RETURN jsonb_build_object('id', v_hh_id, 'household_number', v_number);
END; $$;
```

### Split family

```sql
CREATE OR REPLACE FUNCTION fn_split_family(p_household_id UUID, p_family_id UUID)
RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE
    v_pagoda_id UUID; v_origin_number INTEGER;
    v_new_hh_id UUID;
BEGIN
    -- Get family info
    SELECT f.origin_household_number, h.pagoda_id
    INTO v_origin_number, v_pagoda_id
    FROM families f JOIN households h ON h.id = f.household_id
    WHERE f.id = p_family_id AND f.household_id = p_household_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Family not found'; END IF;

    -- Create new household with the origin number
    INSERT INTO households (pagoda_id, household_number)
    VALUES (v_pagoda_id, v_origin_number)
    RETURNING id INTO v_new_hh_id;

    -- Re-parent the family
    UPDATE families
    SET household_id = v_new_hh_id, family_position = 0, updated_at = now()
    WHERE id = p_family_id;

    -- Verify source still has families
    IF NOT EXISTS (
        SELECT 1 FROM families WHERE household_id = p_household_id
    ) THEN
        RAISE EXCEPTION 'Source household would have 0 families';
    END IF;

    RETURN v_new_hh_id;
END; $$;
```

### Combine family

```sql
CREATE OR REPLACE FUNCTION fn_combine_family(p_target_hh_id UUID, p_source_hh_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE v_count INTEGER; v_origin INTEGER; v_next_pos SMALLINT;
BEGIN
    SELECT count(*) INTO v_count FROM families WHERE household_id = p_source_hh_id;
    IF v_count <> 1 THEN RAISE EXCEPTION 'Source must have exactly 1 family'; END IF;

    SELECT origin_household_number INTO v_origin FROM families
    WHERE household_id = p_source_hh_id LIMIT 1;
    IF EXISTS (
        SELECT 1 FROM families
        WHERE household_id = p_target_hh_id AND origin_household_number = v_origin
    ) THEN RAISE EXCEPTION 'Duplicate origin in target'; END IF;

    SELECT COALESCE(max(family_position) + 1, 0) INTO v_next_pos
    FROM families WHERE household_id = p_target_hh_id;

    UPDATE families
    SET household_id = p_target_hh_id, family_position = v_next_pos, updated_at = now()
    WHERE household_id = p_source_hh_id;

    DELETE FROM households WHERE id = p_source_hh_id;
END; $$;
```

### Backfill search vectors

```sql
CREATE OR REPLACE FUNCTION fn_backfill_search_vectors()
RETURNS INTEGER LANGUAGE plpgsql AS $$
DECLARE v_row RECORD; v_count INTEGER := 0;
BEGIN
    FOR v_row IN SELECT id FROM households LOOP
        PERFORM fn_rebuild_household_search_vector(v_row.id);
        v_count := v_count + 1;
    END LOOP;
    RETURN v_count;
END; $$;
```

---

## RLS Policies (stubs)

```sql
ALTER TABLE pagodas             ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_counters  ENABLE ROW LEVEL SECURITY;
ALTER TABLE households          ENABLE ROW LEVEL SECURITY;
ALTER TABLE families            ENABLE ROW LEVEL SECURITY;
ALTER TABLE members             ENABLE ROW LEVEL SECURITY;

-- Authenticated: full access
CREATE POLICY pol_pagodas_all ON pagodas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY pol_counters_all ON household_counters FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY pol_households_all ON households FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY pol_families_all ON families FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY pol_members_all ON members FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

---

## Operation Mapping (Firestore → Supabase)

| Firestore | Supabase |
|---|---|
| `get(doc 'tdhp/{id}')` | `supabase.from('households').select('*, families(*, members(*))').eq('pagoda_id', pid).eq('household_number', num)` |
| `set(doc)` full overwrite | Transaction: UPDATE household + DELETE/re-INSERT families & members |
| `runTransaction` (counter + write) | `supabase.rpc('fn_create_household_auto_number', {p_pagoda_id, payload})` |
| `batch.set x2` (split) | `supabase.rpc('fn_split_family', {p_household_id, p_family_id})` |
| `batch.set + batch.delete` (combine) | `supabase.rpc('fn_combine_family', {target_id, source_id})` |
| Algolia `search(query)` | `WHERE pagoda_id = ? AND search_vector @@ to_tsquery(...)` |
| `counters/tdhp` read | `supabase.rpc('fn_get_next_household_number', {p_pagoda_id})` |

---

## Migration Steps

1. Run full DDL in Supabase SQL Editor
2. Create a pagoda row for the existing temple
3. Insert a `household_counters` row: `INSERT INTO household_counters (pagoda_id, last_number) VALUES ('<pagoda-uuid>', <current_lastId>)`
4. Migrate each Firestore doc → INSERT into households (with `pagoda_id`), families, members (preserving array indices as positions)
5. Run `SELECT fn_backfill_search_vectors()`
6. Verify search, split, combine operations
