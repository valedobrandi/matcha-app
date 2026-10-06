import shutil
import urllib.request
import zipfile
from pathlib import Path

FACES_URL = "https://zenodo.org/records/18177207/files/StyleGAN3_256x256_images.zip?download=1"
FACES_DIR = Path(__file__).resolve().parent.parent / "seed_assets" / "faces"
EXCLUDED_FILE = Path(__file__).resolve().parent / "seed_faces_excluded.txt"
FACE_SUFFIXES = {".png", ".jpg", ".jpeg", ".webp"}


def main() -> None:
    excluded = set(EXCLUDED_FILE.read_text().split())
    FACES_DIR.mkdir(parents=True, exist_ok=True)
    existing = [path for path in FACES_DIR.iterdir() if path.suffix.lower() in FACE_SUFFIXES]
    if existing:
        print(f"{len(existing)} faces already in {FACES_DIR}, nothing to download.")
        return

    archive_path = FACES_DIR / "faces.zip"
    urllib.request.urlretrieve(FACES_URL, archive_path)
    with zipfile.ZipFile(archive_path) as archive:
        for member in archive.infolist():
            name = Path(member.filename).name
            if member.is_dir() or name in excluded or Path(name).suffix.lower() not in FACE_SUFFIXES:
                continue
            with archive.open(member) as source, open(FACES_DIR / name, "wb") as target:
                shutil.copyfileobj(source, target)
    archive_path.unlink()

    total = sum(1 for path in FACES_DIR.iterdir() if path.suffix.lower() in FACE_SUFFIXES)
    print(f"Wrote {total} faces to {FACES_DIR}")


if __name__ == "__main__":
    main()
