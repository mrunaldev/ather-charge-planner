from html.parser import HTMLParser
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class AssetParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.refs = []
        self.has_inline_style = False
        self.has_inline_script = False

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)

        if tag == "style":
            self.has_inline_style = True

        if tag == "script" and "src" not in attrs:
            self.has_inline_script = True

        for key in ("href", "src"):
            if key in attrs:
                self.refs.append(attrs[key])


def local_refs(refs):
    return [
        ref
        for ref in refs
        if not ref.startswith(("http://", "https://", "data:", "#"))
    ]


def main():
    html = (ROOT / "index.html").read_text()
    parser = AssetParser()
    parser.feed(html)

    missing = [ref for ref in local_refs(parser.refs) if not (ROOT / ref).exists()]
    assert not missing, f"Missing local references: {missing}"
    assert not parser.has_inline_style, "index.html should not contain inline <style>"
    assert not parser.has_inline_script, "index.html should not contain inline <script>"
    assert "assets/css/styles.css" in parser.refs, "styles.css must be linked"
    assert "assets/js/app.js" in parser.refs, "app.js must be linked"
    assert (ROOT / "assets/apple-touch-icon.png").exists(), "Apple touch icon missing"

    with (ROOT / "site.webmanifest").open() as f:
        manifest = json.load(f)

    assert manifest["name"] == "Ather Charge Planner"
    assert manifest["display"] == "standalone"
    assert manifest["icons"], "Manifest must include icons"

    print("PASS static structure and asset checks")


if __name__ == "__main__":
    main()
