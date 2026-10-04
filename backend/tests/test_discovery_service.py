import pytest
from modules.discovery.service import (
    DiscoveryService,
    genders_for_preference,
    prefs_interested_in_gender,
)
from modules.discovery.exceptions import (
    LocationRequiredException,
    InvalidFilterException,
)
from modules.discovery.schemas import (
    DiscoveryProfileCard,
    DiscoveryQuery,
    SuggestQueryParams,
    SearchQueryParams,
    ViewerContext,
)


class FakeDiscoveryRepository:
    def __init__(self, viewer: ViewerContext | None = None, cards=None):
        self.viewer = viewer
        self.cards = cards or []
        self.last_query: DiscoveryQuery | None = None
        self.last_name_search: tuple | None = None

    async def get_viewer_context(self, user_id: int):
        return self.viewer

    async def list_profiles(self, query: DiscoveryQuery):
        self.last_query = query
        return self.cards

    async def search_by_name(self, viewer_id: int, term: str, limit: int):
        self.last_name_search = (viewer_id, term, limit)
        return []


@pytest.mark.parametrize(
    "pref,expected",
    [
        ("man", ["male"]),
        ("woman", ["female"]),
        ("bisexual", ["male", "female"]),
    ],
)
def test_genders_for_preference(pref, expected):
    assert genders_for_preference(pref) == expected


@pytest.mark.parametrize(
    "gender,expected",
    [
        ("male", ["man", "bisexual"]),
        ("female", ["woman", "bisexual"]),
        ("other", ["bisexual"]),
    ],
)
def test_prefs_interested_in_gender(gender, expected):
    assert prefs_interested_in_gender(gender) == expected


@pytest.mark.parametrize(
    "viewer_pref,viewer_gender,candidate_gender,candidate_pref,matches",
    [
        # man seeking male: only male candidates interested in men (man/bi)
        ("man", "male", "male", "man", True),
        ("man", "male", "male", "bisexual", True),
        ("man", "male", "male", "woman", False),
        ("man", "male", "female", "man", False),
        ("man", "male", "other", "bisexual", False),  # bi set is male/female only
        # woman seeking female
        ("woman", "female", "female", "woman", True),
        ("woman", "female", "female", "bisexual", True),
        ("woman", "female", "male", "woman", False),
        # bisexual viewer (male): sees male+female whose pref accepts male
        ("bisexual", "male", "female", "man", True),
        ("bisexual", "male", "male", "man", True),
        ("bisexual", "male", "other", "bisexual", False),
        # viewer gender other: candidates must prefer bisexual
        ("bisexual", "other", "female", "bisexual", True),
        ("bisexual", "other", "female", "woman", False),
        ("man", "other", "male", "bisexual", True),
        ("man", "other", "male", "man", False),
    ],
)
def test_mutual_orientation_matrix(
    viewer_pref, viewer_gender, candidate_gender, candidate_pref, matches
):
    """Compose service orientation params the way list_profiles applies them."""
    candidate_genders = genders_for_preference(viewer_pref)
    interested_prefs = prefs_interested_in_gender(viewer_gender)
    actual = (
        candidate_gender in candidate_genders
        and candidate_pref in interested_prefs
    )
    assert actual is matches


@pytest.mark.asyncio
async def test_viewer_orientation_unusable_returns_empty():
    repo = FakeDiscoveryRepository(
        viewer=ViewerContext(id=1, gender=None, sexual_preference=None)
    )
    service = DiscoveryService(repo)
    result = await service.suggest(1, SuggestQueryParams())
    assert result == []
    assert repo.last_query is None


@pytest.mark.asyncio
async def test_suggest_builds_orientation_query():
    repo = FakeDiscoveryRepository(
        viewer=ViewerContext(
            id=1,
            gender="male",
            sexual_preference="woman",
            latitude=48.85,
            longitude=2.35,
        ),
        cards=[
            DiscoveryProfileCard(
                id=2,
                username="a",
                first_name="A",
                last_name="A",
                age=25,
                gender="female",
                fame_rating=1,
                liked_by_me=False,
            )
        ],
    )
    service = DiscoveryService(repo)
    result = await service.suggest(1, SuggestQueryParams())
    assert len(result) == 1
    assert repo.last_query is not None
    assert repo.last_query.candidate_genders == ["female"]
    assert repo.last_query.interested_in_viewer_prefs == ["man", "bisexual"]
    assert repo.last_query.sort == "distance"
    assert repo.last_query.order == "asc"


@pytest.mark.asyncio
async def test_suggest_defaults_to_fame_without_coords():
    repo = FakeDiscoveryRepository(
        viewer=ViewerContext(id=1, gender="male", sexual_preference="bisexual")
    )
    service = DiscoveryService(repo)
    await service.suggest(1, SuggestQueryParams())
    assert repo.last_query is not None
    assert repo.last_query.sort == "fame"
    assert repo.last_query.order == "desc"


@pytest.mark.asyncio
async def test_search_defaults_to_fame_without_coords():
    repo = FakeDiscoveryRepository(
        viewer=ViewerContext(id=1, gender="male", sexual_preference="bisexual")
    )
    service = DiscoveryService(repo)
    await service.search(1, SearchQueryParams())
    assert repo.last_query is not None
    assert repo.last_query.sort == "fame"
    assert repo.last_query.order == "desc"


@pytest.mark.asyncio
async def test_location_required_when_sorting_by_distance():
    repo = FakeDiscoveryRepository(
        viewer=ViewerContext(id=1, gender="male", sexual_preference="bisexual")
    )
    service = DiscoveryService(repo)
    with pytest.raises(LocationRequiredException):
        await service.suggest(1, SuggestQueryParams(sort="distance"))


@pytest.mark.asyncio
async def test_location_required_when_max_distance_without_coords():
    repo = FakeDiscoveryRepository(
        viewer=ViewerContext(id=1, gender="male", sexual_preference="bisexual")
    )
    service = DiscoveryService(repo)
    with pytest.raises(LocationRequiredException):
        await service.search(1, SearchQueryParams(max_distance_km=10))


@pytest.mark.asyncio
async def test_invalid_age_range():
    repo = FakeDiscoveryRepository(
        viewer=ViewerContext(id=1, gender="male", sexual_preference="bisexual")
    )
    service = DiscoveryService(repo)
    with pytest.raises(InvalidFilterException) as exc:
        await service.search(1, SearchQueryParams(age_min=40, age_max=20))
    assert exc.value.code == "INVALID_FILTER"


@pytest.mark.asyncio
async def test_unknown_sort_raises_invalid_filter():
    repo = FakeDiscoveryRepository(
        viewer=ViewerContext(id=1, gender="male", sexual_preference="bisexual")
    )
    service = DiscoveryService(repo)
    with pytest.raises(InvalidFilterException) as exc:
        await service.suggest(1, SuggestQueryParams(sort="nope"))
    assert exc.value.field == "sort"


@pytest.mark.asyncio
async def test_age_out_of_bounds_raises_invalid_filter():
    repo = FakeDiscoveryRepository(
        viewer=ViewerContext(id=1, gender="male", sexual_preference="bisexual")
    )
    service = DiscoveryService(repo)
    with pytest.raises(InvalidFilterException) as exc:
        await service.search(1, SearchQueryParams(age_min=10))
    assert exc.value.field == "age_min"


@pytest.mark.asyncio
async def test_search_passes_filters_and_dedupes_tags():
    repo = FakeDiscoveryRepository(
        viewer=ViewerContext(
            id=1,
            gender="female",
            sexual_preference="man",
            latitude=1.0,
            longitude=2.0,
        )
    )
    service = DiscoveryService(repo)
    await service.search(
        1,
        SearchQueryParams(
            age_min=20,
            age_max=30,
            fame_min=1,
            fame_max=50,
            max_distance_km=25,
            tag_ids=[3, 1, 3],
        ),
    )
    q = repo.last_query
    assert q is not None
    assert q.age_min == 20 and q.age_max == 30
    assert q.fame_min == 1 and q.fame_max == 50
    assert q.max_distance_km == 25
    assert q.tag_ids == [3, 1]


@pytest.mark.asyncio
async def test_search_by_name_should_pass_viewer_and_trimmed_term_when_valid():
    repo = FakeDiscoveryRepository()
    service = DiscoveryService(repo)
    await service.search_by_name(5, "  bob ")
    assert repo.last_name_search == (5, "bob", 10)


@pytest.mark.asyncio
@pytest.mark.parametrize("target", ["", " ", "  ", "a", " a "])
async def test_search_by_name_should_raise_invalid_filter_when_term_shorter_than_two_chars(target):
    repo = FakeDiscoveryRepository()
    service = DiscoveryService(repo)
    with pytest.raises(InvalidFilterException):
        await service.search_by_name(5, target)
    assert repo.last_name_search is None
