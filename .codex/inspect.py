from pathlib import Path
text = Path('src/middleware/validation.ts').read_text(encoding='utf-8')
start = text.find("'number.base': 'ID")
print(start)
print(repr(text[start:start+40]))
