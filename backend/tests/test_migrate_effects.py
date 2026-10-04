from database.migrate import EFFECTS, MIGRATIONS_DIR


def test_should_have_an_effect_probe_for_every_migration_file_when_baselining_old_databases():
    versions = {f.stem for f in MIGRATIONS_DIR.glob("*.sql")}

    assert versions - set(EFFECTS) == set()
