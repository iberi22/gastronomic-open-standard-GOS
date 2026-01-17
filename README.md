# AI-Chef: The Intelligent Open Source Cookbook

[![build](https://github.com/Anduin2017/HowToCook/actions/workflows/build.yml/badge.svg)](https://github.com/Anduin2017/HowToCook/actions/workflows/build.yml)
[![Standard](https://img.shields.io/badge/Recipe%20Standard-Scientific-gold)](PLAN_DE_ESTANDARIZACION.md)
[![AI Powered](https://img.shields.io/badge/AI-Powered-blueviolet)](automation/)
[![API Ready](https://img.shields.io/badge/API-JSON-green)](API_README.md)

**AI-Chef** is not just a cookbook; it's a data-driven culinary project. We are transforming traditional recipes into structured, scientifically accurate data points suitable for nutritional analysis, semantic search, and food tech applications.

## 🌟 Key Features

*   **Scientific Accuracy**: Recipes include exact nutritional data calculated from a linked ingredient database.
*   **Ingredient Graph**: Every ingredient is a separate entity in `ingredients/` with its own chemical and nutritional profile.
*   **AI Automation**: We use LLMs (Gemini) to parse unstructured text, estimate mass, and generate sensory profiles (0-10 scales for flavors).
*   **Open Data**: All data is stored in standard Markdown/YAML, making it accessible and future-proof.

## 🚀 Getting Started

### 1. Browse Recipes
Visit the [Live Site](https://anduin2017.github.io/AI-Chef/) (GitHub Pages) or browse the `dishes/` directory.

### 2. Use the API / Data
We provide tools to index and search the recipe database programmatically. See [**API Documentation**](API_README.md).

```bash
python automation/search_recipes.py --query "Bandeja Paisa"
```

### 3. Run the Automation (Developers)

We have a suite of Python tools in `automation/` to manage the data quality.

**Prerequisites:**
```bash
pip install -r automation/requirements.txt
export GEMINI_API_KEY="your_key"
```

**Audit the Repository:**
Check which recipes are missing scientific data.
```bash
python automation/audit_recipes.py
```

**Standardize a Recipe (AI Magic):**
Upgrade a simple text recipe to the Scientific Standard automatically.
```bash
python automation/standardize_recipes.py --target_directory "dishes/your/path" --limit 1
```

## 📚 Documentation

*   [**Standardization Protocol**](PLAN_DE_ESTANDARIZACION.md): The "Gold Standard" schema for recipes.
*   [**Ingredient Protocol**](PROTOCOLO_INGREDIENTES.md): How we model ingredient data.
*   [**API Access**](API_README.md): How to consume the JSON data.
*   [**Master Plan**](PLAN_SABORES_LATINOS.md): The vision and methodology.
*   [**Tasks**](TASK.md): Current work in progress.

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md).
If you are adding a recipe, try to follow the format in `dishes/_template.md` or let our AI agents handle the formatting for you.

---

*Forked from [HowToCook](https://github.com/Anduin2017/HowToCook) - Adding a layer of Data Science & AI.*
