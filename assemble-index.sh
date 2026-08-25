#!/usr/bin/env bash
# Concatenate sheet <article>s into index.html (same-page #anchors).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
python3 "$ROOT/check-lab-wrap.py"
python3 - "$ROOT" << 'PY'
from pathlib import Path
import re, sys
root = Path(sys.argv[1])
sheets = [
    ("00-overview", "00 · Общая карта", "четыре вопроса · чайник = прогон e2e · quiz"),
    ("01-skills", "01 · Skill", "маршрутный лист · пак · глагол+объект"),
    ("02-rules", "02 · Rule", "ПДД · пять файлов takeaway"),
    ("03-rag", "03 · RAG", "2–4 карточки · диета · кофемашина"),
    ("04-adr", "04 · ADR", "почему A не B · 009 логин · 005 slice"),
    ("20-login", "20 · login", "один промпт · что уже в репо"),
    ("21-login-skill", "21 · без skill / со skill", "ChromeDriver vs qa-write-test"),
    ("22-login-rule", "22 · без rule / с rule", "full suite vs tags + -Denv"),
    ("23-login-rag", "23 · без RAG / с RAG", "$(\"input\") vs data-testid"),
    ("24-login-adr", "24 · без ADR / с ADR", "e2e на 401 vs api"),
    ("30-login-micro", "30 · микропроект", "две вкладки · один промпт"),
    ("31-login-full", "31 · полный стек", "канон wrong password"),
    ("32-login-minus-one", "32 · полный − 1", "своя галлюцинация у слоя"),
    ("33-login-pairs", "33 · пары", "2 из 4 · дыры складываются"),
    ("34-login-singles", "34 · одиночки / пусто", "1 из 4 · учебный интернет"),
    ("35-login-context", "35 · context ≠ слой", "пятая опция · сцена, не скрипт"),
    # 36-login-lab.html — standalone interactive page, not concatenated.
    ("10-stack-skills", "10 · skills", "есть маршрут, нет тормозов"),
    ("11-stack-skills-rules", "11 · skills + rules", "занятие 2 · канон"),
    ("12-stack-skills-rules-rag", "12 · skills + rules + rag", "занятие 3"),
    ("13-stack-skills-rules-rag-adr", "13 · полный стек", "занятие 4"),
    ("40-homework", "40 · ДЗ · main → develop", "два промпта · блок сдачи"),
    # 50-glossary.html — standalone reading page, not concatenated.
]
sections = [
    ("По одной на слой + общая", sheets[:5]),
    ("Login · без слоя / со слоем", sheets[5:10]),
    ("Login · живой опыт", sheets[10:16]),
    ("Наращивание", sheets[16:20]),
    ("Домашка", sheets[20:]),
    ("Словарь", []),
]

def article(sid):
    t = (root / f"{sid}.html").read_text()
    m = re.search(r"<article class=\"sheet\".*</article>", t, re.S)
    if not m:
        raise SystemExit(f"no article in {sid}")
    return m.group(0)

def toc(items):
    return "\n".join(
        f'  <a class="sheet-link" href="#{sid}"><b>{title}</b><span>{hint}</span></a>'
        for sid, title, hint in items
    )

blocks = []
for heading, items in sections:
    block = f'  <h2 class="sec">{heading}</h2>\n{toc(items)}'
    if heading.startswith("Login · живой"):
        block += '\n  <a class="sheet-link" href="36-login-lab.html"><b>36 · лаборатория</b><span>вкл/выкл слоёв · галлюцинация live</span></a>'
    if heading == "Словарь":
        block += '\n  <a class="sheet-link" href="50-glossary.html"><b>50 · словарь AI-стека</b><span>термин · общее · на LoginTests</span></a>'
    blocks.append(block)

index = f'''<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Handouts · Rule · Skill · RAG · ADR</title>
  <link rel="stylesheet" href="css/handouts.css">
</head>
<body class="deck">
<main class="gallery no-print" id="top">
  <p class="brand__name">QA.GURU</p>
  <h1>Rule · Skill · RAG · ADR</h1>
  <p>Листы A4 курса AI-first QA. Кликни строку — лист ниже на этой же странице.</p>

{chr(10).join(blocks)}

  <p style="margin-top:24px"><a href="README.md">README.md</a> · пак: <a href="https://github.com/qa-guru/ai-first-student-workspace/blob/main/docs/agent-skills/PACK.md">PACK.md</a> · словарь: <a href="50-glossary.html">50-glossary.html</a></p>
</main>

{chr(10).join(article(sid) for sid, _, _ in sheets)}
<script>
document.querySelectorAll('a[href^="#"]').forEach(function (a) {{
  a.addEventListener("click", function (e) {{
    var id = a.getAttribute("href").slice(1);
    var el = document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    el.scrollIntoView({{ block: "start" }});
    if (history.replaceState) history.replaceState(null, "", "#" + id);
  }});
}});
</script>
</body>
</html>
'''
(root / "index.html").write_text(index)
print("wrote", root / "index.html")
PY