import pytest

from db_support import add_user
from modules.discovery.repository import DiscoveryRepository
from modules.discovery.schemas import DiscoveryQuery

pytestmark = [pytest.mark.integration, pytest.mark.asyncio]

PARIS_CENTER = (48.8566, 2.3522)
EIFFEL_TOWER = (48.8584, 2.2945)


async def test_should_give_the_distance_in_whole_kilometres_when_both_users_have_a_location(
    connection, token, tag_id
):
    viewer = await add_user(connection, token, "viewer", tag_ids=[tag_id], latitude=PARIS_CENTER[0], longitude=PARIS_CENTER[1])
    near = await add_user(connection, token, "near", tag_ids=[tag_id], latitude=EIFFEL_TOWER[0], longitude=EIFFEL_TOWER[1])
    query = DiscoveryQuery(
        viewer_id=viewer, viewer_lat=PARIS_CENTER[0], viewer_lon=PARIS_CENTER[1],
        candidate_genders=["female"], interested_in_viewer_prefs=["bisexual"],
        tag_ids=[tag_id], sort="distance", order="asc", limit=1000, offset=0,
    )

    cards = await DiscoveryRepository(connection).list_profiles(query)

    assert [(card.id, card.distance_km) for card in cards] == [(near, 4.0)]
