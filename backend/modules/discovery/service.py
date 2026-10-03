from typing import List, Optional, Tuple
from modules.discovery.repository import DiscoveryRepository
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
    SearchingBarProfile,
)

_ALLOWED_SORTS = frozenset({"age", "distance", "fame", "common_tags"})
_ALLOWED_ORDERS = frozenset({"asc", "desc"})
_NAME_SEARCH_MIN_LENGTH = 2
_NAME_SEARCH_LIMIT = 10
_DEFAULT_ORDER = {
    "age": "asc",
    "distance": "asc",
    "fame": "desc",
    "common_tags": "desc",
}


def genders_for_preference(pref: str) -> List[str]:
    if pref == "man":
        return ["male"]
    if pref == "woman":
        return ["female"]
    if pref == "bisexual":
        return ["male", "female"]
    raise InvalidFilterException("Unknown sexual preference", field="sexual_preference")


def prefs_interested_in_gender(gender: str) -> List[str]:
    if gender == "male":
        return ["man", "bisexual"]
    if gender == "female":
        return ["woman", "bisexual"]
    if gender == "other":
        return ["bisexual"]
    raise InvalidFilterException("Unknown gender", field="gender")


def _viewer_orientation_usable(viewer: ViewerContext) -> bool:
    return viewer.gender is not None and viewer.sexual_preference is not None


def _resolve_sort_order(
    sort: Optional[str],
    order: Optional[str],
    *,
    viewer_has_coords: bool,
) -> Tuple[str, str]:
    if sort is not None and sort not in _ALLOWED_SORTS:
        raise InvalidFilterException("Unknown sort key", field="sort")
    if order is not None and order not in _ALLOWED_ORDERS:
        raise InvalidFilterException("Unknown order", field="order")

    if sort == "distance" and not viewer_has_coords:
        raise LocationRequiredException()

    if sort is None:
        # Suggest and search: no coords → silent fame fallback (not LOCATION_REQUIRED).
        resolved_sort = "distance" if viewer_has_coords else "fame"
    else:
        resolved_sort = sort

    if order is None:
        resolved_order = _DEFAULT_ORDER[resolved_sort]
    else:
        resolved_order = order

    return resolved_sort, resolved_order


def _validate_search_filters(params: SearchQueryParams) -> None:
    for field_name, value, lo, hi in (
        ("age_min", params.age_min, 18, 100),
        ("age_max", params.age_max, 18, 100),
        ("fame_min", params.fame_min, 0, 100),
        ("fame_max", params.fame_max, 0, 100),
    ):
        if value is not None and not (lo <= value <= hi):
            raise InvalidFilterException(
                f"{field_name} must be between {lo} and {hi}",
                field=field_name,
            )
    if (
        params.age_min is not None
        and params.age_max is not None
        and params.age_min > params.age_max
    ):
        raise InvalidFilterException("age_min cannot exceed age_max", field="age_min")
    if (
        params.fame_min is not None
        and params.fame_max is not None
        and params.fame_min > params.fame_max
    ):
        raise InvalidFilterException("fame_min cannot exceed fame_max", field="fame_min")
    if params.max_distance_km is not None and params.max_distance_km <= 0:
        raise InvalidFilterException(
            "max_distance_km must be greater than 0",
            field="max_distance_km",
        )
    if any(tag_id < 1 for tag_id in params.tag_ids):
        raise InvalidFilterException("tag_ids must be positive integers", field="tag_ids")


class DiscoveryService:
    def __init__(self, repository: DiscoveryRepository):
        self.repository = repository

    async def suggest(
        self, viewer_id: int, params: SuggestQueryParams
    ) -> List[DiscoveryProfileCard]:
        viewer = await self.repository.get_viewer_context(viewer_id)
        if viewer is None or not _viewer_orientation_usable(viewer):
            return []

        has_coords = viewer.latitude is not None and viewer.longitude is not None
        sort, order = _resolve_sort_order(
            params.sort,
            params.order,
            viewer_has_coords=has_coords,
        )
        query = self._build_query(
            viewer,
            sort=sort,
            order=order,
            limit=params.limit,
            offset=params.offset,
        )
        return await self.repository.list_profiles(query)

    async def search(
        self, viewer_id: int, params: SearchQueryParams
    ) -> List[DiscoveryProfileCard]:
        viewer = await self.repository.get_viewer_context(viewer_id)
        if viewer is None or not _viewer_orientation_usable(viewer):
            return []

        _validate_search_filters(params)

        has_coords = viewer.latitude is not None and viewer.longitude is not None
        if params.max_distance_km is not None and not has_coords:
            raise LocationRequiredException()

        sort, order = _resolve_sort_order(
            params.sort,
            params.order,
            viewer_has_coords=has_coords,
        )
        query = self._build_query(
            viewer,
            sort=sort,
            order=order,
            limit=params.limit,
            offset=params.offset,
            age_min=params.age_min,
            age_max=params.age_max,
            fame_min=params.fame_min,
            fame_max=params.fame_max,
            max_distance_km=params.max_distance_km,
            tag_ids=list(dict.fromkeys(params.tag_ids)),
        )
        return await self.repository.list_profiles(query)

    def _build_query(
        self,
        viewer: ViewerContext,
        *,
        sort: str,
        order: str,
        limit: int,
        offset: int,
        age_min: Optional[int] = None,
        age_max: Optional[int] = None,
        fame_min: Optional[int] = None,
        fame_max: Optional[int] = None,
        max_distance_km: Optional[float] = None,
        tag_ids: Optional[List[int]] = None,
    ) -> DiscoveryQuery:
        assert viewer.gender is not None
        assert viewer.sexual_preference is not None
        return DiscoveryQuery(
            viewer_id=viewer.id,
            viewer_lat=viewer.latitude,
            viewer_lon=viewer.longitude,
            candidate_genders=genders_for_preference(viewer.sexual_preference),
            interested_in_viewer_prefs=prefs_interested_in_gender(viewer.gender),
            age_min=age_min,
            age_max=age_max,
            fame_min=fame_min,
            fame_max=fame_max,
            max_distance_km=max_distance_km,
            tag_ids=tag_ids or [],
            sort=sort,
            order=order,
            limit=limit,
            offset=offset,
        )


    async def search_by_name(
            self,
            viewer_id: int,
            target: str,
    ) -> List[SearchingBarProfile]:
        term = target.strip()
        if len(term) < _NAME_SEARCH_MIN_LENGTH:
            raise InvalidFilterException(
                f"target must be at least {_NAME_SEARCH_MIN_LENGTH} characters",
                field="target",
            )
        return await self.repository.search_by_name(
            viewer_id, term, _NAME_SEARCH_LIMIT
        )