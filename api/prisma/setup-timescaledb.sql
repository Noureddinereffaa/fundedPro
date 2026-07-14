-- TimescaleDB hypertable setup
-- Run this AFTER Prisma migrations to convert tables to hypertables
-- Required: PostgreSQL with TimescaleDB extension installed

CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- Convert tables to hypertables (idempotent)
DO $$
DECLARE
    hypertables TEXT[][] := ARRAY[
        ARRAY['candles', 'timestamp'],
        ARRAY['ticks', 'timestamp'],
        ARRAY['market_snapshots', 'timestamp']
    ];
    tbl TEXT[];
    exists BOOLEAN;
BEGIN
    FOREACH tbl SLICE 1 IN ARRAY hypertables
    LOOP
        SELECT EXISTS (
            SELECT 1 FROM information_schema.tables WHERE table_name = tbl[1]
        ) INTO exists;
        IF exists THEN
            BEGIN
                PERFORM create_hypertable(tbl[1], tbl[2], if_not_exists => TRUE);
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Hypertable % already exists or creation failed: %', tbl[1], SQLERRM;
            END;
        END IF;
    END LOOP;
END $$;

-- Add compression policies (after 7 days)
SELECT add_compression_policy('candles', INTERVAL '7 days', if_not_exists => TRUE);
SELECT add_compression_policy('ticks', INTERVAL '1 day', if_not_exists => TRUE);
SELECT add_compression_policy('market_snapshots', INTERVAL '7 days', if_not_exists => TRUE);

-- Add retention policies (auto-drop data older than 2 years)
SELECT add_retention_policy('ticks', INTERVAL '30 days', if_not_exists => TRUE);
SELECT add_retention_policy('candles', INTERVAL '2 years', if_not_exists => TRUE);
SELECT add_retention_policy('market_snapshots', INTERVAL '2 years', if_not_exists => TRUE);
