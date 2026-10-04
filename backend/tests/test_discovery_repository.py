"""In-memory twin of DiscoveryRepository.list_profiles pool/filter rules.

Mirrors SQL semantics in repository.py (completion EXISTS, either-way blocks,
tag AND, max_distance null-drop, pagination). Not a Postgres runner — keep
this twin aligned with the SQL comments when either side changes.
"""

from typing import List, Optional
from modules.discovery.schemas import DiscoveryProfileCard, DiscoveryQuery


class Candidate:
    def __init__(
        self,
        *,
        id: int,
        username: str = "u",
        first_name: str = "F",
        last_name: str = "L",
        age: int = 25,
        gender: str = "female",
        sexual_preference: str = "bisexual",
        fame_rating: int = 0,
        bio: Optional[str] = "bio",
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        location_label: Optional[str] = None,
        tag_ids: Optional[List[int]] = None,
        photo_count: int = 1,
    ):
        self.id = id
        self.username = username
        self.first_name = first_name
        self.last_name = last_name
        self.age = age
        self.gender = gender
        self.sexual_preference = sexual_preference
        self.fame_rating = fame_rating
        self.bio = bio
        self.latitude = latitude
        self.longitude = longitude
        self.location_label = location_label
        self.tag_ids = [1] if tag_ids is None else tag_ids
        self.photo_count = photo_count


def _is_completed(c: Candidate) -> bool:
    return (
        c.bio is not None
        and c.age is not None
        and c.gender is not None
        and c.sexual_preference is not None
        and len(c.tag_ids) > 0
        and c.photo_count > 0
    )


def _blocked_either_way(blocks: dict, a: int, b: int) -> bool:
    return blocks.get((a, b)) == "active" or blocks.get((b, a)) == "active"


def list_profiles_twin(
    candidates: List[Candidate],
    blocks: dict,
    query: DiscoveryQuery,
    *,
    viewer_tag_ids: Optional[List[int]] = None,
) -> List[DiscoveryProfileCard]:
    """Mirrors discovery repository pool/filter semantics for unit tests."""
    viewer_tags = set(viewer_tag_ids or [])
    out: List[DiscoveryProfileCard] = []
    for c in candidates:
        if c.id == query.viewer_id:
            continue
        if not _is_completed(c):
            continue
        if _blocked_either_way(blocks, query.viewer_id, c.id):
            continue
        if c.gender not in query.candidate_genders:
            continue
        if c.sexual_preference not in query.interested_in_viewer_prefs:
            continue
        if query.age_min is not None and c.age < query.age_min:
            continue
        if query.age_max is not None and c.age > query.age_max:
            continue
        if query.fame_min is not None and c.fame_rating < query.fame_min:
            continue
        if query.fame_max is not None and c.fame_rating > query.fame_max:
            continue
        if query.tag_ids and not set(query.tag_ids).issubset(set(c.tag_ids)):
            continue

        distance_km = None
        if (
            query.viewer_lat is not None
            and query.viewer_lon is not None
            and c.latitude is not None
            and c.longitude is not None
        ):
            # Approximate for filter tests only (not asserting haversine accuracy).
            distance_km = abs(query.viewer_lat - c.latitude) * 111.0

        if query.max_distance_km is not None:
            if distance_km is None or distance_km > query.max_distance_km:
                continue

        out.append(
            DiscoveryProfileCard(
                id=c.id,
                username=c.username,
                first_name=c.first_name,
                last_name=c.last_name,
                age=c.age,
                gender=c.gender,  # type: ignore[arg-type]
                fame_rating=c.fame_rating,
                distance_km=distance_km,
                common_tags_count=len(set(c.tag_ids) & viewer_tags),
                location_label=c.location_label,
                liked_by_me=False,
            )
        )
    return out[query.offset : query.offset + query.limit]


def _base_query(**overrides) -> DiscoveryQuery:
    data = dict(
        viewer_id=1,
        viewer_lat=48.0,
        viewer_lon=2.0,
        candidate_genders=["male", "female"],
        interested_in_viewer_prefs=["man", "bisexual"],
        sort="fame",
        order="desc",
        limit=20,
        offset=0,
    )
    data.update(overrides)
    return DiscoveryQuery(**data)


def test_excludes_self():
    candidates = [
        Candidate(id=1, gender="female", sexual_preference="man"),
        Candidate(id=2, gender="female", sexual_preference="man"),
    ]
    result = list_profiles_twin(candidates, {}, _base_query())
    assert [c.id for c in result] == [2]


def test_excludes_candidate_missing_tags():
    candidates = [
        Candidate(id=2, gender="female", sexual_preference="man", tag_ids=[]),
    ]
    result = list_profiles_twin(candidates, {}, _base_query())
    assert result == []


def test_excludes_candidate_missing_photos():
    candidates = [
        Candidate(id=2, gender="female", sexual_preference="man", photo_count=0),
    ]
    result = list_profiles_twin(candidates, {}, _base_query())
    assert result == []


def test_excludes_either_way_block_a_to_b():
    candidates = [Candidate(id=2, gender="female", sexual_preference="man")]
    blocks = {(1, 2): "active"}
    result = list_profiles_twin(candidates, blocks, _base_query())
    assert result == []


def test_excludes_either_way_block_b_to_a():
    candidates = [Candidate(id=2, gender="female", sexual_preference="man")]
    blocks = {(2, 1): "active"}
    result = list_profiles_twin(candidates, blocks, _base_query())
    assert result == []


def test_inactive_block_still_visible():
    candidates = [Candidate(id=2, gender="female", sexual_preference="man")]
    blocks = {(1, 2): "inactive"}
    result = list_profiles_twin(candidates, blocks, _base_query())
    assert len(result) == 1
    assert result[0].id == 2


def test_search_tag_and_filter():
    candidates = [
        Candidate(id=2, gender="female", sexual_preference="man", tag_ids=[1, 2]),
        Candidate(id=3, gender="female", sexual_preference="man", tag_ids=[1]),
    ]
    result = list_profiles_twin(candidates, {}, _base_query(tag_ids=[1, 2]))
    assert [c.id for c in result] == [2]


def test_common_tags_count_is_intersection_with_viewer_tags():
    candidates = [
        Candidate(id=2, gender="female", sexual_preference="man", tag_ids=[1, 2, 9]),
    ]
    result = list_profiles_twin(
        candidates, {}, _base_query(), viewer_tag_ids=[1, 9, 7]
    )
    assert result[0].common_tags_count == 2


def test_max_distance_drops_null_distance_candidates():
    candidates = [
        Candidate(
            id=2,
            gender="female",
            sexual_preference="man",
            latitude=None,
            longitude=None,
        ),
        Candidate(
            id=3,
            gender="female",
            sexual_preference="man",
            latitude=48.01,
            longitude=2.0,
        ),
    ]
    result = list_profiles_twin(
        candidates, {}, _base_query(max_distance_km=50.0)
    )
    assert [c.id for c in result] == [3]


def test_pagination_limit_offset():
    candidates = [
        Candidate(id=2, gender="female", sexual_preference="man"),
        Candidate(id=3, gender="female", sexual_preference="man"),
        Candidate(id=4, gender="female", sexual_preference="man"),
    ]
    page = list_profiles_twin(
        candidates, {}, _base_query(limit=1, offset=1)
    )
    assert [c.id for c in page] == [3]
