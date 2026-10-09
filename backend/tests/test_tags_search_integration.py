"""Runs the tag search SQL on a real Postgres (`pytest -m integration`)."""
import pytest

from modules.tags.repository import TagsRepository

pytestmark = [pytest.mark.integration, pytest.mark.asyncio]


async def test_should_match_wildcard_characters_literally_when_the_search_contains_them(connection, token):
    for name in (f"{token}-a_b", f"{token}-axb", f"{token}-100%", f"{token}-1000"):
        await connection.execute("INSERT INTO tags (name) VALUES ($1)", name)
    tags = TagsRepository(connection)

    underscore = [tag.name for tag in await tags.search_tags(f"{token}-a_b")]
    percent = [tag.name for tag in await tags.search_tags(f"{token}-100%")]

    assert underscore == [f"{token}-a_b"]
    assert percent == [f"{token}-100%"]
