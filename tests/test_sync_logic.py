import unittest
import os
import shutil
import sys

# Add scripts to path to import
sys.path.append(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'scripts'))
from sync_how_to_cook import parse_markdown_recipe, convert_to_ai_chef_format

class TestSyncLogic(unittest.TestCase):
    def setUp(self):
        self.test_content = """# Tomato Scrambled Eggs

## Ingredients
- Tomato: 2
- Egg: 3

## Steps
1. Fry eggs.
2. Fry tomato.
3. Mix.
"""
        self.test_file_path = "test_recipe.md"
        with open(self.test_file_path, "w") as f:
            f.write(self.test_content)

    def tearDown(self):
        if os.path.exists(self.test_file_path):
            os.remove(self.test_file_path)

    def test_parse(self):
        data = parse_markdown_recipe(self.test_file_path)
        self.assertEqual(data['title'], "Tomato Scrambled Eggs")
        self.assertIn("Fry eggs", data['content'])

    def test_convert(self):
        data = {
            'title': "Tomato Scrambled Eggs",
            'content': self.test_content,
            'ingredients': ['Tomato', 'Egg'],
            'difficulty': 'Easy'
        }
        output = convert_to_ai_chef_format(data, "carnes")
        self.assertIn('title: "Tomato Scrambled Eggs"', output)
        self.assertIn('region: "China"', output)
        self.assertIn('category: "carnes"', output)
        self.assertIn('source_repo: "Anduin2017/HowToCook"', output)

if __name__ == '__main__':
    unittest.main()
