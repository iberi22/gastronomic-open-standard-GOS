#!/usr/bin/env python3
"""Drive the shipped China and source checks. Not a reimplementation."""
import json
import pathlib
import tempfile
import unittest

import audit_gate

ROOT = pathlib.Path(__file__).resolve().parents[3]
REVIEWED = (
    "principales/gongbao-jiding.md",
    "principales/huiguo-rou.md",
    "principales/mapo-doufu.md",
)
SCRIPT = ROOT / "site" / "scripts" / "copy-content.js"


class ChinaGateTests(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.dishes = pathlib.Path(tmp.name) / "dishes"
        self.root_china = pathlib.Path(tmp.name) / "root-china"
        self.sources = {}
        for relative in REVIEWED:
            source = (ROOT / "dishes" / "china" / relative).read_bytes()
            dest = self.root_china / relative
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(source)
            self.sources[relative] = source

    def script(self):
        return SCRIPT.read_text(encoding="utf-8")

    def publish(self, relative=None, body=None):
        if relative is None:
            for item in REVIEWED:
                self.publish(item)
            return
        path = self.dishes / "china" / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(self.sources[relative] if body is None else body)

    def test_shipped_copier_allows_the_reviewed_files(self):
        self.publish()
        errors = audit_gate.china_publication_errors(
            self.dishes, self.script(), self.root_china
        )
        self.assertEqual(errors, [])

    def test_third_china_dish_is_rejected(self):
        self.publish()
        self.publish("sopas/other.md", b"---\nlicense: AGPL-3.0-or-later\n---\n# Other\n")
        errors = audit_gate.china_publication_errors(
            self.dishes, self.script(), self.root_china
        )
        self.assertTrue(any("exactly" in item for item in errors))

    def test_removed_china_skip_is_rejected(self):
        self.publish()
        script = self.script().replace("toLowerCase() === 'china'", "toLowerCase() === 'never'")
        errors = audit_gate.china_publication_errors(
            self.dishes, script, self.root_china
        )
        self.assertTrue(any("no longer skips" in item for item in errors))

    def test_chinese_directory_is_rejected(self):
        self.publish()
        (self.dishes / "chinese").mkdir()
        errors = audit_gate.china_publication_errors(
            self.dishes, self.script(), self.root_china
        )
        self.assertTrue(any("chinese" in item for item in errors))

    def test_sources_object_keys_count_and_a_name_does_not(self):
        self.assertEqual(
            audit_gate.source_object_hits(
                {"sources": [{"org": "USDA", "id": "1", "url": "https://example.test"}]}
            ),
            1,
        )
        self.assertEqual(
            audit_gate.source_object_hits({"sources": {"url": "https://example.test"}}),
            1,
        )
        self.assertEqual(
            audit_gate.source_object_hits({"sources": ["USDA FoodData Central"]}),
            0,
        )
        self.assertEqual(
            audit_gate.source_object_hits({"sources": [{"name": "USDA FoodData Central"}]}),
            0,
        )


class PublisherSourceAllowlistTests(unittest.TestCase):
    def test_reviewed_ingredient_is_accepted_and_another_path_is_rejected(self):
        reviewed = ROOT / "site/src/content/ingredients/vegetables/tomate.json"
        other = ROOT / "site/src/content/ingredients/vegetables/zanahoria.json"
        reviewed_record = json.loads(reviewed.read_text(encoding="utf-8"))
        invented = {
            "sources": [
                {
                    "org": "USDA FoodData Central",
                    "id": "FDC 999999",
                    "url": "https://example.test/not-a-record",
                }
            ]
        }
        self.assertTrue(audit_gate.publisher_source_allowed(reviewed, reviewed_record))
        self.assertFalse(audit_gate.publisher_source_allowed(other, invented))


class GateEntryTests(unittest.TestCase):
    def test_main_prints_hold_and_keeps_blocked_ids(self):
        import contextlib
        import io

        buf = io.StringIO()
        with contextlib.redirect_stdout(buf):
            code = audit_gate.main()
        text = buf.getvalue()
        self.assertEqual(code, 0)
        self.assertIn("BLOCKED", text)
        self.assertIn("CORRECTIONS_HOLD", text)
        self.assertNotIn("REGRESSIONS", text)
        for token in ("F1 ", "F2 ", "F3 ", "F13 "):
            self.assertIn(token, text)


if __name__ == "__main__":
    unittest.main()
