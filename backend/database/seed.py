"""Dev-only seed script: populates the matcha DB with fake profiles for local demos.

Prerequisites
  - Run from ``backend/`` with the project venv active and deps installed
    (``Faker`` is listed in ``requirements.txt``).
  - ``DATABASE_URL`` must point at a migrated database (e.g. after
    ``python -m database.migrate`` or ``docker compose up``).
  - Prefer a fresh DB: re-seeding into a non-empty users table will add more
    rows and may hit unique constraints on email/username.

Usage
    python -m database.seed
    python -m database.seed --users 500

All seeded accounts share the same password (``SEED_PASSWORD``). The script
prints the user count and that password when it finishes — enough for Hong to
log in and exercise discovery with volume.
"""
import argparse
import asyncio
import random

import asyncpg
import bcrypt
from faker import Faker

from core.config import settings

SEED_PASSWORD = "Password123!"
GENDERS = ["male", "female", "other"]
PREFERENCES = ["man", "woman", "bisexual"]
TAGS = [
    "music", "gaming", "hiking", "cooking", "travel", "photography", "yoga",
    "reading", "cinema", "dancing", "cycling", "art", "coffee", "wine",
    "running", "surfing", "climbing", "gardening", "board-games", "tech",
]
# (label, lat, lon) — users are clustered around real cities with jitter so
# the discovery module's distance/fame ranking has something realistic to sort.
CITIES = [
    ("Paris, France", 48.8566, 2.3522),
    ("Lyon, France", 45.7640, 4.8357),
    ("Marseille, France", 43.2965, 5.3698),
    ("Berlin, Germany", 52.5200, 13.4050),
    ("London, UK", 51.5074, -0.1278),
]


async def seed(user_count: int) -> None:
    fake = Faker()
    Faker.seed(42)
    random.seed(42)

    password_hash = bcrypt.hashpw(SEED_PASSWORD.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    conn = await asyncpg.connect(dsn=settings.DATABASE_URL)
    try:
        user_ids = await _seed_users(conn, fake, user_count, password_hash)
        tag_ids = await _seed_tags(conn)
        await _seed_user_tags(conn, user_ids, tag_ids)
        await _seed_user_photos(conn, user_ids)
        await _seed_likes(conn, user_ids)
        await _seed_visits(conn, user_ids)
        await _seed_blocks_and_reports(conn, user_ids, fake)
    finally:
        await conn.close()

    print(f"Seeded {len(user_ids)} users (login password for all: {SEED_PASSWORD!r}).")


async def _seed_users(conn, fake, count, password_hash) -> list[int]:
    rows = []
    for _ in range(count):
        label, lat, lon = random.choice(CITIES)
        rows.append((
            fake.unique.email(),
            fake.unique.user_name(),
            fake.first_name(),
            fake.last_name(),
            password_hash,
            True,  # is_verified
            random.choice(GENDERS),
            random.choice(PREFERENCES),
            random.randint(18, 65),
            fake.paragraph(nb_sentences=3),
            random.randint(0, 100),
            lat + random.uniform(-0.15, 0.15),
            lon + random.uniform(-0.15, 0.15),
            label,
            random.random() < 0.85,  # location_consent
        ))

    ids = []
    for row in rows:
        record = await conn.fetchrow(
            """
            INSERT INTO users (
                email, username, first_name, last_name, password_hash, is_verified,
                gender, sexual_preference, age, bio, fame_rating,
                latitude, longitude, location_label, location_consent
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
            RETURNING id
            """,
            *row,
        )
        ids.append(record["id"])
    return ids


async def _seed_tags(conn) -> list[int]:
    ids = []
    for name in TAGS:
        record = await conn.fetchrow(
            """
            INSERT INTO tags (name) VALUES ($1)
            ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
            RETURNING id
            """,
            name,
        )
        ids.append(record["id"])
    return ids


async def _seed_user_tags(conn, user_ids, tag_ids) -> None:
    rows = []
    for user_id in user_ids:
        for tag_id in random.sample(tag_ids, k=random.randint(2, 6)):
            rows.append((user_id, tag_id))
    await conn.executemany(
        "INSERT INTO user_tags (user_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
        rows,
    )


async def _seed_user_photos(conn, user_ids) -> None:
    rows = []
    for user_id in user_ids:
        photo_count = random.randint(1, 5)
        for i in range(photo_count):
            rows.append((
                user_id,
                f"https://picsum.photos/seed/matcha-{user_id}-{i}/500/500",
                i == 0,
            ))
    await conn.executemany(
        "INSERT INTO user_photos (user_id, url, is_profile_photo) VALUES ($1, $2, $3)",
        rows,
    )


def _random_pairs(user_ids: list[int], count: int) -> set[tuple[int, int]]:
    pairs: set[tuple[int, int]] = set()
    attempts = 0
    while len(pairs) < count and attempts < count * 10:
        attempts += 1
        a, b = random.sample(user_ids, 2)
        pairs.add((a, b))
    return pairs


async def _seed_likes(conn, user_ids) -> None:
    pairs = _random_pairs(user_ids, count=len(user_ids) * 6)
    rows = [(a, b, "active" if random.random() < 0.9 else "inactive") for a, b in pairs]
    await conn.executemany(
        """
        INSERT INTO likes (from_user_id, to_user_id, status)
        VALUES ($1, $2, $3)
        ON CONFLICT (from_user_id, to_user_id) DO NOTHING
        """,
        rows,
    )


async def _seed_visits(conn, user_ids) -> None:
    pairs = _random_pairs(user_ids, count=len(user_ids) * 8)
    rows = list(pairs)
    await conn.executemany(
        """
        INSERT INTO visits (viewer_id, target_id)
        VALUES ($1, $2)
        ON CONFLICT (viewer_id, target_id) DO NOTHING
        """,
        rows,
    )


async def _seed_blocks_and_reports(conn, user_ids, fake) -> None:
    block_pairs = _random_pairs(user_ids, count=max(10, len(user_ids) // 10))
    await conn.executemany(
        """
        INSERT INTO blocks (from_user_id, to_user_id)
        VALUES ($1, $2)
        ON CONFLICT (from_user_id, to_user_id) DO NOTHING
        """,
        list(block_pairs),
    )

    report_pairs = _random_pairs(user_ids, count=max(10, len(user_ids) // 15))
    rows = [(a, b, fake.sentence()) for a, b in report_pairs]
    await conn.executemany(
        """
        INSERT INTO reports (reporter_id, target_id, reason)
        VALUES ($1, $2, $3)
        ON CONFLICT (reporter_id, target_id) DO NOTHING
        """,
        rows,
    )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--users", type=int, default=500, help="number of users to create")
    args = parser.parse_args()
    asyncio.run(seed(args.users))


if __name__ == "__main__":
    main()
