"""Package OmniBar's Firefox and Chromium extensions."""

from argparse import ArgumentParser
from pathlib import Path
from tempfile import NamedTemporaryFile
from zipfile import ZIP_DEFLATED, ZipFile

ROOT = Path(__file__).resolve().parent
COMMON = ("dock.js", "sidebar.css", "theme.js", "icons", "fonts", "LICENSE")
SIDEBAR = ("manifest.json", "background.js", "sidebar.html", "sidebar.js")
BROWSERS = {
    "firefox": (ROOT, SIDEBAR + ("firefox-sidebar.css", "app-sidebar.js", "privacy.html", "PRIVACY.md")),
    "chromium": (
        ROOT / "chromium",
        SIDEBAR + ("chromium-sidebar.css", "PRIVACY.md"),
    ),
}


def build(browser, output):
    source, files = BROWSERS[browser]
    common = COMMON + ("frame-bridge.js",) if browser == "chromium" else COMMON
    target = output / f"omnibar-{browser}.zip"
    with NamedTemporaryFile(dir=output, delete=False) as temp:
        staging = Path(temp.name)
    try:
        with ZipFile(staging, "w", compression=ZIP_DEFLATED) as archive:
            for directory, names in ((ROOT, common), (source, files)):
                for name in names:
                    path = directory / name
                    entries = sorted(p for p in path.rglob("*") if p.is_file()) if path.is_dir() else [path]
                    for entry in entries:
                        archive.write(entry, entry.relative_to(directory).as_posix())
        staging.replace(target)
    finally:
        staging.unlink(missing_ok=True)
    print(f"Built {target}")


def main():
    parser = ArgumentParser(description=__doc__)
    parser.add_argument("--browser", choices=("all", *BROWSERS), default="all")
    parser.add_argument("--output", type=Path, default=ROOT / "dist")
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    for browser in BROWSERS if args.browser == "all" else (args.browser,):
        build(browser, args.output)


if __name__ == "__main__":
    main()
