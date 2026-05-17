import unittest

from services.ai_service import budget_allocation_shares, budget_tier, _format_allocation_hint
from services.recommendation_service import (
    BUDGET_UTILIZATION_MIN,
    _category_budget_caps,
    _pick_listing,
    _total_for_parts,
)


class TestRecommendationBudget(unittest.TestCase):
    def test_gaming_allocation_sums_near_one(self):
        shares = budget_allocation_shares("gaming", "desktop")
        self.assertAlmostEqual(sum(shares.values()), 1.0, places=2)

    def test_category_caps_for_30k(self):
        caps = _category_budget_caps(30000, "gaming", "desktop")
        self.assertEqual(caps["GPU"], 30000 * 0.38)
        self.assertEqual(caps["CPU"], 30000 * 0.22)

    def test_pick_listing_prefers_target_not_cheapest(self):
        listings = [
            {"store": "A", "price": 3000.0},
            {"store": "B", "price": 8000.0},
            {"store": "C", "price": 11000.0},
        ]
        picked = _pick_listing(listings, max_price=12000, target_price=10000)
        self.assertEqual(picked["price"], 11000.0)

    def test_pick_listing_respects_max_price(self):
        listings = [
            {"store": "A", "price": 5000.0},
            {"store": "B", "price": 15000.0},
        ]
        picked = _pick_listing(listings, max_price=10000, target_price=9000)
        self.assertEqual(picked["price"], 5000.0)

    def test_allocation_hint_mentions_target_range(self):
        hint = _format_allocation_hint(30000, "gaming", "desktop")
        self.assertIn("26,400", hint)
        self.assertIn("30,000", hint)

    def test_utilization_threshold(self):
        self.assertEqual(BUDGET_UTILIZATION_MIN, 0.85)

    def test_enthusiast_tier_for_150k(self):
        self.assertEqual(budget_tier(150_000), "enthusiast")
        hint = _format_allocation_hint(150_000, "gaming", "desktop")
        self.assertIn("4080", hint)
        self.assertIn("132,000", hint)

    def test_total_for_parts(self):
        total = _total_for_parts(
            [{"price": 5000}, {"price": 7500.5}, {"price": None}]
        )
        self.assertEqual(total, 12500.5)


if __name__ == "__main__":
    unittest.main()
