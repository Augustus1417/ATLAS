import unittest

from services.chat_service import (
    _extract_openrouter_content,
    _is_save_build_intent,
)


class TestChatService(unittest.TestCase):
    def test_extract_string_content(self):
        body = {"choices": [{"message": {"content": "  Hello  "}}]}
        self.assertEqual(_extract_openrouter_content(body), "Hello")

    def test_extract_empty_content_returns_none(self):
        body = {"choices": [{"message": {"content": None}}]}
        self.assertIsNone(_extract_openrouter_content(body))

    def test_extract_parts_array_content(self):
        body = {
            "choices": [
                {
                    "message": {
                        "content": [
                            {"type": "text", "text": "Line one. "},
                            {"type": "text", "text": "Line two."},
                        ]
                    }
                }
            ]
        }
        self.assertEqual(_extract_openrouter_content(body), "Line one. Line two.")

    def test_save_build_intent(self):
        self.assertTrue(_is_save_build_intent("Save as build"))
        self.assertTrue(_is_save_build_intent("please save this build"))
        self.assertFalse(_is_save_build_intent("recommend a gaming build"))


if __name__ == "__main__":
    unittest.main()
