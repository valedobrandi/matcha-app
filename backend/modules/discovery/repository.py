import asyncpg
from typing import List, Optional
from modules.discovery.schemas import (
    DiscoveryProfileCard,
    DiscoveryQuery,
    ViewerContext,
    SearchingBarProfile
)

# Earth radius km for Haversine.
_EARTH_KM = 6371.0

_SORT_SQL = {
    "age": "age",
    "distance": "distance_km",
    "fame": "fame_rating",
    "common_tags": "common_tags_count",
}

# Who a viewer ($1) may see as "u": not self, profile completed, no active block
# either way. Shared by every discovery query so visibility cannot drift.
# Completion twins UsersService is_profile_completed.
# Block exclusion twins SocialRepository.is_blocked_either_way.
_VISIBLE_TO_VIEWER_SQL = """
                u.id <> $1
                AND u.bio IS NOT NULL
                AND u.age IS NOT NULL
                AND u.gender IS NOT NULL
                AND u.sexual_preference IS NOT NULL
                AND EXISTS (SELECT 1 FROM user_tags ut WHERE ut.user_id = u.id)
                AND EXISTS (SELECT 1 FROM user_photos up WHERE up.user_id = u.id)
                AND NOT EXISTS (
                  SELECT 1 FROM blocks
                  WHERE status = 'active'
                    AND (
                      (from_user_id = $1 AND to_user_id = u.id)
                      OR (from_user_id = u.id AND to_user_id = $1)
                    )
                )"""


class DiscoveryRepository:
    def __init__(self, connection: asyncpg.Connection):
        self.connection = connection

    async def get_viewer_context(self, user_id: int) -> Optional[ViewerContext]:
        row = await self.connection.fetchrow(
            """
            SELECT id, gender, sexual_preference, latitude, longitude
            FROM users
            WHERE id = $1
            """,
            user_id,
        )
        if row is None:
            return None
        return ViewerContext.model_validate(dict(row))

    async def list_profiles(self, query: DiscoveryQuery) -> List[DiscoveryProfileCard]:
        """Single suggest/search list path — do not fork a second SQL string.

        Completion filter twins UsersService.get_profile is_completed.
        Block exclusion twins SocialRepository.is_blocked_either_way.
        """
        sort_expr = _SORT_SQL.get(query.sort, "fame_rating")
        order = "ASC" if query.order.lower() == "asc" else "DESC"
        nulls = " NULLS LAST" if query.sort == "distance" else ""

        # Primary sort + stable secondaries (premise 6 default chain when sort=distance).
        if query.sort == "distance":
            order_by = (
                f"distance_km {order}{nulls}, "
                f"fame_rating DESC, common_tags_count DESC, id ASC"
            )
        elif query.sort == "fame":
            order_by = f"fame_rating {order}, common_tags_count DESC, id ASC"
        elif query.sort == "common_tags":
            order_by = f"common_tags_count {order}, id ASC"
        else:
            order_by = f"{sort_expr} {order}, id ASC"

        sql = f"""
            WITH candidates AS (
              SELECT
                u.id,
                u.username,
                u.first_name,
                u.last_name,
                u.age,
                u.gender,
                COALESCE(u.fame_rating, 0) AS fame_rating,
                CASE
                  WHEN $2::float8 IS NULL OR $3::float8 IS NULL
                    OR u.latitude IS NULL OR u.longitude IS NULL
                  THEN NULL
                  ELSE ROUND(
                    (
                      {_EARTH_KM} * acos(
                        LEAST(1.0, GREATEST(-1.0,
                          cos(radians($2)) * cos(radians(u.latitude))
                          * cos(radians(u.longitude) - radians($3))
                          + sin(radians($2)) * sin(radians(u.latitude))
                        ))
                      )
                    )::numeric,
                    1
                  )::float8
                END AS distance_km,
                (
                  SELECT COUNT(*)::int
                  FROM user_tags vt
                  JOIN user_tags ct ON ct.tag_id = vt.tag_id
                  WHERE vt.user_id = $1 AND ct.user_id = u.id
                ) AS common_tags_count,
                u.location_label,
                EXISTS (
                  SELECT 1
                  FROM likes
                  WHERE from_user_id = $1 AND to_user_id = u.id AND status = 'active'
                ) AS liked_by_me
              FROM users u
              WHERE {_VISIBLE_TO_VIEWER_SQL}
                AND u.gender = ANY($4::text[])
                AND u.sexual_preference = ANY($5::text[])
                AND ($6::int IS NULL OR u.age >= $6)
                AND ($7::int IS NULL OR u.age <= $7)
                AND ($8::int IS NULL OR COALESCE(u.fame_rating, 0) >= $8)
                AND ($9::int IS NULL OR COALESCE(u.fame_rating, 0) <= $9)
                AND (
                  cardinality($10::int[]) = 0
                  OR (
                    SELECT COUNT(DISTINCT ut2.tag_id)
                    FROM user_tags ut2
                    WHERE ut2.user_id = u.id AND ut2.tag_id = ANY($10::int[])
                  ) = cardinality($10::int[])
                )
            )
            SELECT *
            FROM candidates
            WHERE (
              $11::float8 IS NULL
              OR (distance_km IS NOT NULL AND distance_km <= $11)
            )
            ORDER BY {order_by}
            LIMIT $12 OFFSET $13
            """

        rows = await self.connection.fetch(
            sql,
            query.viewer_id,
            query.viewer_lat,
            query.viewer_lon,
            query.candidate_genders,
            query.interested_in_viewer_prefs,
            query.age_min,
            query.age_max,
            query.fame_min,
            query.fame_max,
            query.tag_ids,
            query.max_distance_km,
            query.limit,
            query.offset,
        )
        return [DiscoveryProfileCard.model_validate(dict(r)) for r in rows]


    async def search_by_name(
            self,
            viewer_id: int,
            term: str,
            limit: int,
    ) -> List[SearchingBarProfile]:
        escaped = term.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        rows = await self.connection.fetch(
            f"""
            SELECT u.id, u.username, u.first_name, u.last_name
            FROM users u
            WHERE {_VISIBLE_TO_VIEWER_SQL}
              AND (
                u.username ILIKE $2 ESCAPE '\\'
                OR u.first_name ILIKE $2 ESCAPE '\\'
                OR u.last_name ILIKE $2 ESCAPE '\\'
              )
            ORDER BY u.username ASC, u.id ASC
            LIMIT $3
            """,
            viewer_id,
            f"%{escaped}%",
            limit,
        )
        return [SearchingBarProfile.model_validate(dict(r)) for r in rows]