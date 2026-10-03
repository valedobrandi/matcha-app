from pydantic import BaseModel, ConfigDict, Field
from typing import List, Literal, Optional


class DiscoveryProfileCard(BaseModel):
    model_config = ConfigDict(json_schema_serialization_defaults_required=True)
    id: int
    username: str
    first_name: str
    last_name: str
    age: int
    gender: Literal["male", "female", "other"]
    fame_rating: int
    distance_km: Optional[float] = None
    common_tags_count: int = 0
    location_label: Optional[str] = None
    liked_by_me: bool


class SuggestQueryParams(BaseModel):
    """HTTP suggest params. sort/order validated in service → INVALID_FILTER."""

    limit: int = Field(20, ge=1, le=100)
    offset: int = Field(0, ge=0)
    sort: Optional[str] = None
    order: Optional[str] = None


class SearchQueryParams(SuggestQueryParams):
    """HTTP search params. Filter bounds validated in service → INVALID_FILTER."""

    age_min: Optional[int] = None
    age_max: Optional[int] = None
    fame_min: Optional[int] = None
    fame_max: Optional[int] = None
    max_distance_km: Optional[float] = None
    tag_ids: List[int] = Field(default_factory=list)


class DiscoveryQuery(BaseModel):
    viewer_id: int
    viewer_lat: Optional[float]
    viewer_lon: Optional[float]
    candidate_genders: List[str]
    interested_in_viewer_prefs: List[str]
    age_min: Optional[int] = None
    age_max: Optional[int] = None
    fame_min: Optional[int] = None
    fame_max: Optional[int] = None
    max_distance_km: Optional[float] = None
    tag_ids: List[int] = Field(default_factory=list)
    sort: str
    order: str
    limit: int
    offset: int


class ViewerContext(BaseModel):
    id: int
    gender: Optional[Literal["male", "female", "other"]] = None
    sexual_preference: Optional[Literal["man", "woman", "bisexual"]] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class SearchingBarProfile(BaseModel):
    id: int
    username: str
    first_name: str
    last_name: str