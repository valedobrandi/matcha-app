"""Row builders for the integration tests. Each user gets a unique name from the test token."""


async def add_user(
    connection, token, label, *, tag_ids=(), photo=True, bio="bio", age=25,
    gender="female", sexual_preference="bisexual",
) -> int:
    user_id = await connection.fetchval(
        """
        INSERT INTO users (email, username, first_name, last_name, gender, sexual_preference, age, bio)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
        """,
        f"{token}{label}@example.test", f"{token}{label}", label.capitalize(), "Tester",
        gender, sexual_preference, age, bio,
    )
    for tag in tag_ids:
        await connection.execute("INSERT INTO user_tags (user_id, tag_id) VALUES ($1, $2)", user_id, tag)
    if photo:
        await connection.execute(
            "INSERT INTO user_photos (user_id, url, is_profile_photo) VALUES ($1, $2, TRUE)",
            user_id, f"/uploads/{token}{label}.jpg",
        )
    return user_id


async def add_block(connection, from_user_id, to_user_id, status="active") -> None:
    await connection.execute(
        "INSERT INTO blocks (from_user_id, to_user_id, status) VALUES ($1, $2, $3)",
        from_user_id, to_user_id, status,
    )


async def add_visit(connection, viewer_id, target_id) -> None:
    await connection.execute(
        "INSERT INTO visits (viewer_id, target_id) VALUES ($1, $2)", viewer_id, target_id
    )


async def add_like(connection, from_user_id, to_user_id, status="active", at=None) -> None:
    await connection.execute(
        """
        INSERT INTO likes (from_user_id, to_user_id, status, updated_at)
        VALUES ($1, $2, $3, COALESCE($4::timestamp, NOW()))
        """,
        from_user_id, to_user_id, status, at,
    )


async def add_notification(connection, user_id, actor_id, type="liked") -> None:
    await connection.execute(
        "INSERT INTO in_app_notifications (user_id, type, actor_id) VALUES ($1, $2, $3)",
        user_id, type, actor_id,
    )
