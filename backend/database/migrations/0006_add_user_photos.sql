CREATE TABLE IF NOT EXISTS user_photos (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    url VARCHAR(225) NOT NULL,
    is_profile_photo BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX one_profile_photo_per_user
ON user_photos(user_id)
WHERE is_profile_photo = true;

-- check_max_photos function
CREATE OR REPLACE FUNCTION check_max_photos()
RETURNS TRIGGER AS $$
BEGIN
    IF (SELECT COUNT(*) FROM user_photos WHERE user_id = NEW.user_id) >= 5 THEN
        RAISE EXCEPTION 'A user cannot have more than 5 photos';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_max_photos ON user_photos;
CREATE TRIGGER trg_check_max_photos
BEFORE INSERT ON user_photos
FOR EACH ROW
EXECUTE FUNCTION check_max_photos();