# 如何贡献

## 简介

直接修改/添加做菜指南并提交Pull request即可。

在写新菜谱时，请复制并修改已有的模板: [示例菜](./dishes/template/示例菜/示例菜.md)。

我们建议在贡献之前，阅读仓库的[行为守则](./CODE_OF_CONDUCT.md)。

## 测试

对于Python（`gos/`）开发，请使用 `uv` 运行测试套件：

```bash
uv sync && uv run pytest -q
```
