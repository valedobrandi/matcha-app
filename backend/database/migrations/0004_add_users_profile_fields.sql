-- add profile related fields required for the "complete your profile" flow

ALTER TABLE users
    ADD COLUMN gender VARCHAR(20),
    ADD COLUMN sexual_preference VARCHAR(20),
    ADD COLUMN age INT,
    ADD COLUMN bio TEXT,
    ADD COLUMN fame_rating INT default 0,
    ADD COLUMN latitude DOUBLE PRECISION,
    ADD COLUMN longitude DOUBLE PRECISION,
    ADD COLUMN last_connection TIMESTAMP;