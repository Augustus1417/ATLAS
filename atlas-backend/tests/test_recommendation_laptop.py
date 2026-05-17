import unittest

from services.ai_service import (
    fallback_bundle_device,
    is_bundle_device_type,
    normalize_device_type,
)
from services.recommendation_service import (
    _filter_bundle_device_parts,
    _generate_bundle_device_recommendation,
)
from utils.component_pricing import normalize_category


class TestRecommendationLaptop(unittest.TestCase):
    def test_normalize_device_type(self):
        self.assertEqual(normalize_device_type("notebook"), "laptop")
        self.assertEqual(normalize_device_type("Laptop"), "laptop")
        self.assertTrue(is_bundle_device_type("laptop"))
        self.assertFalse(is_bundle_device_type("desktop"))

    def test_filter_bundle_strips_desktop_parts(self):
        parts = [
            {"category": "GPU", "name": "RTX 4060"},
            {"category": "Device", "name": "ASUS VivoBook Go 15"},
        ]
        filtered = _filter_bundle_device_parts(parts)
        self.assertEqual(len(filtered), 1)
        self.assertEqual(filtered[0]["category"], "Device")
        self.assertIn("VivoBook", filtered[0]["name"])

    def test_filter_bundle_maps_laptop_category(self):
        parts = [{"category": "Laptop", "name": "Lenovo IdeaPad 3"}]
        filtered = _filter_bundle_device_parts(parts)
        self.assertEqual(normalize_category(filtered[0]["category"]), "Device")

    def test_filter_bundle_empty_when_only_desktop(self):
        parts = [{"category": "GPU", "name": "GTX 1650"}]
        self.assertEqual(_filter_bundle_device_parts(parts), [])

    def test_fallback_laptop_20k_gaming(self):
        parts = fallback_bundle_device("gaming", "laptop", 20000)
        self.assertEqual(parts[0]["category"], "Device")
        self.assertTrue(parts[0]["name"])

    def test_generate_bundle_uses_fallback_when_ai_returns_gpu(self):
        class FakeConn:
            pass

        conn = FakeConn()

        def fake_fetch(*_args, **_kwargs):
            return [{"category": "GPU", "name": "RTX 4060 8GB"}]

        def fake_resolve(_conn, part, **_kwargs):
            return {
                "component_id": 1,
                "category": part["category"],
                "name": part["name"],
                "brand": "ASUS",
                "cheapest_price": 18500.0,
                "link": None,
                "store": "Test",
                "listings": [],
            }

        import services.recommendation_service as rec

        original_fetch = rec.fetch_ai_recommendations
        original_resolve = rec._resolve_part_with_pricing
        try:
            rec.fetch_ai_recommendations = fake_fetch
            rec._resolve_part_with_pricing = fake_resolve
            result = _generate_bundle_device_recommendation(
                conn, 20000, "gaming", "laptop"
            )
        finally:
            rec.fetch_ai_recommendations = original_fetch
            rec._resolve_part_with_pricing = original_resolve

        self.assertEqual(len(result["parts"]), 1)
        self.assertEqual(result["parts"][0]["category"], "Device")
        self.assertNotIn("GPU", result["parts"][0]["name"].upper())
        self.assertEqual(result["device_type"], "laptop")


if __name__ == "__main__":
    unittest.main()
