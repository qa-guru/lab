#!/usr/bin/env python3
"""Lab 36 guards: no wrap-to-fit Java; cli panel is shell, not Java."""
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parent
css = (ROOT / "css" / "handouts.css").read_text()
js = (ROOT / "js" / "login-lab.js").read_text()
errors = []

LOCK = """body.lab pre,
body.lab .lab-code,
body.lab .lab-ln"""

JAVA_IN_CLI = (
    (re.compile(r"\bopen\s*\("), "Selenide open() — Java, не команда шелла"),
    (re.compile(r"(?<!:)//"), "комментарий // — в cli только #"),
    (re.compile(r";\s*$"), "';' в конце — Java-оператор, не шелл"),
    (re.compile(r"\$\s*\("), "Selenide $()"),
    (re.compile(
        r"\b(loginPage|WebDriver|ChromeDriver|shouldHave|shouldHave|setValue)\b"
    ), "Java/Selenide API"),
    (re.compile(r"@(?:Layer|Tag|Epic|Feature|Test|DisplayName|Step)\b"), "Java-аннотация"),
)


def block_after(selector: str, src: str) -> str:
    m = re.search(re.escape(selector) + r"\s*\{([^}]*)\}", src)
    return m.group(1) if m else ""


def class_block(name: str, src: str) -> str:
    m = re.search(rf"(?m)^\.{re.escape(name)}\s*\{{([^}}]*)\}}", src)
    return m.group(1) if m else ""


def skip_str(src: str, i: int) -> int:
    q = src[i]
    i += 1
    while i < len(src):
        if src[i] == "\\":
            i += 2
            continue
        if src[i] == q:
            return i + 1
        i += 1
    return i


def matching_paren(src: str, open_idx: int) -> str:
    if src[open_idx] != "(":
        raise ValueError("expected '('")
    depth = 0
    i = open_idx
    while i < len(src):
        ch = src[i]
        if ch in "\"'":
            i = skip_str(src, i)
            continue
        if ch == "(":
            depth += 1
        elif ch == ")":
            depth -= 1
            if depth == 0:
                return src[open_idx : i + 1]
        i += 1
    raise ValueError("unbalanced '('")


def unescape_js(inner: str) -> str:
    out = []
    i = 0
    while i < len(inner):
        if inner[i] == "\\" and i + 1 < len(inner):
            nxt = inner[i + 1]
            out.append({"n": "\n", "t": "\t", '"': '"', "'": "'", "\\": "\\"}.get(nxt, nxt))
            i += 2
            continue
        out.append(inner[i])
        i += 1
    return "".join(out)


def string_literals(expr: str) -> str:
    bits = []
    i = 0
    while i < len(expr):
        if expr[i] == '"':
            j = skip_str(expr, i)
            bits.append(unescape_js(expr[i + 1 : j - 1]))
            i = j
            continue
        i += 1
    return "".join(bits)


def split_top_commas(src: str) -> list[str]:
    parts = []
    buf = []
    depth = 0
    i = 0
    while i < len(src):
        ch = src[i]
        if ch in "\"'":
            j = skip_str(src, i)
            buf.append(src[i:j])
            i = j
            continue
        if ch in "([{":
            depth += 1
        elif ch in ")]}":
            depth -= 1
        elif ch == "," and depth == 0:
            parts.append("".join(buf).strip())
            buf = []
            i += 1
            continue
        buf.append(ch)
        i += 1
    if buf:
        parts.append("".join(buf).strip())
    return parts


def ln_texts(block: str) -> list[str]:
    texts = []
    i = 0
    while True:
        j = block.find("ln(", i)
        if j < 0:
            break
        call = matching_paren(block, j + 2)
        args = split_top_commas(call[1:-1])
        if len(args) >= 2:
            text = string_literals(args[1])
            if text.strip():
                texts.append(text)
        i = j + 3
    return texts


def cli_blocks(src: str) -> list[str]:
    blocks = []
    idx = 0
    while True:
        k = src.find('panel("cli"', idx)
        if k < 0:
            break
        paren = src.find("(", k)
        blocks.append(matching_paren(src, paren))
        idx = k + 1
    start = src.find("var runLines = []")
    end = src.find("var gradleLines", start)
    if start < 0 or end < 0:
        raise ValueError("runLines block not found")
    blocks.append(src[start:end])
    return blocks


def dialect_hits(line: str) -> list[str]:
    return [why for rx, why in JAVA_IN_CLI if rx.search(line)]


# --- wrap (narrow columns must scroll, not break tokens) ---

lock_body = block_after(LOCK, css)
if not lock_body:
    errors.append("missing CSS lock `body.lab pre, body.lab .lab-code, body.lab .lab-ln`")
else:
    for need in (
        "white-space: pre !important",
        "overflow-wrap: normal !important",
        "word-break: normal !important",
    ):
        if need not in lock_body:
            errors.append(f"lab-wrap lock missing `{need}`")

for sel in ("lab-code", "lab-ln"):
    body = class_block(sel, css)
    if not body:
        errors.append(f"missing `.{sel}` rule")
        continue
    for bad in ("pre-wrap", "break-word", "overflow-wrap: anywhere", "word-break: break"):
        if bad in body:
            errors.append(f"`.{sel}` must not set `{bad}` — wrap mid-token in narrow lab columns")

ln = class_block("lab-ln", css)
if ln and "width: max-content" not in ln:
    errors.append("`.lab-ln` needs `width: max-content` so long lines scroll, not wrap")

if '.join("\\n")' in js or ".join('\\n')" in js:
    errors.append("login-lab.js: newline join + display:block .lab-ln = double blank lines; use join(\"\")")

fn = re.search(r"function paintLines\([\s\S]*?\.join\(([^)]*)\)", js)
if not fn or fn.group(1).strip() not in ('""', "''"):
    errors.append('paintLines must .join("") — .lab-ln is display:block')

# --- props: context snippet = compose() when rule is on ---

html = (ROOT / "36-login-lab.html").read_text()
props_pre = re.search(
    r'data-slot="props"[\s\S]*?<div class="panel__body">[\s\S]*?<pre class="lab-code">([\s\S]*?)</pre>',
    html,
)
props_js = re.search(
    r'var propsLines = \[([\s\S]*?)\];',
    js,
)
if not props_pre or not props_js:
    errors.append("props extractor missed HTML snippet or JS propsLines")
else:
    html_body = [ln for ln in props_pre.group(1).strip().splitlines() if ln.strip()]
    js_lines = [ln for ln in ln_texts("[" + props_js.group(1) + "]") if ln.strip()]
    if html_body != js_lines:
        errors.append(
            "props context <pre> drifted from compose():\n    html: "
            + " | ".join(html_body)
            + "\n    js:   "
            + " | ".join(js_lines)
        )
    keys = [ln for ln in html_body if "=" in ln]
    if len(keys) != 5:
        errors.append(f"props snippet must have 5 properties, got {len(keys)}")
    if any("default.properties" in ln for ln in html_body + js_lines):
        errors.append("props snippet must be one file (ci.properties), not default+ci")

props_load = re.search(
    r'data-slot="props"[\s\S]*?<div class="panel__body">[\s\S]*?<p class="lab-src__load">(.*?)</p>',
    html,
)
if not props_load or props_load.group(1).strip() != "не трогал — URL не в Java":
    errors.append("props context load must be `не трогал — URL не в Java`")
if 'propsLoad = "не трогал — URL не в Java"' not in js:
    errors.append("props compose() load must match the context caption")
if re.search(r'propsKind\s*=\s*"bad"', js):
    errors.append("without Rule, props must not go red — URL is in Java/cli, not ci.properties")
if "AuthApiTests#loginWithInvalidPassword" not in html:
    errors.append("ADR card/pop must name AuthApiTests#loginWithInvalidPassword")
if "AuthApiTests#loginWithInvalidPassword" not in js:
    errors.append("ADR why/extra must name AuthApiTests#loginWithInvalidPassword")

if re.search(r"\.lab-cell--expected\s+\.lab-ln--ok\s*\{", css):
    errors.append(
        "expected must not green all .lab-ln--ok — only test/page, same as ideal"
    )

# --- cli dialect: shell only ---

samples = {
    'open("http://localhost:9821/login");': True,
    'open("http://localhost:9821/login");   // URL в Java': True,
    "./gradlew test -Denv=ci -DincludeTags=e2e": False,
    'git commit -am "login"                 # без OK': False,
    "cd tests/java/tests-java-gradle-junit5-allure3-selenide": False,
    "curl http://localhost:9821/login": False,
}
for sample, must_fail in samples.items():
    hit = bool(dialect_hits(sample))
    if hit != must_fail:
        errors.append(f"cli-dialect ruleset broken on {sample!r}")

try:
    cli_lines = []
    for block in cli_blocks(js):
        cli_lines.extend(ln_texts(block))
except ValueError as e:
    errors.append(f"cli extractor: {e}")
    cli_lines = []

blob = "\n".join(cli_lines)
if cli_lines:
    for needle in ("./gradlew", "git commit", "pytest"):
        if needle not in blob:
            errors.append(
                f"cli extractor missed `{needle}` — parser broken or panel emptied"
            )
    for line in cli_lines:
        for why in dialect_hits(line):
            errors.append(f"cli · терминал: {why}: {line}")
else:
    errors.append("cli extractor found no lines")

if re.search(r"\.lab-src__hd:hover\s+\.lab-src__pop", css):
    errors.append("lab pop must not open on hover — pin / focus-within only")
legend = class_block("lab-legend", css)
if legend and "z-index: 6" not in legend:
    errors.append("`.lab-legend` z-index must stay 6 — pops sit above it")
if "class=\"lab-dock\"" not in html and "class='lab-dock'" not in html:
    errors.append("toggles must live in `.lab-dock` (sticky), not inside the prompt card")

if "if (n === 4 && ctx)" not in js:
    errors.append(
        "verdict «тест как в репо» must require ctx — otherwise meta preset clones ideal"
    )
if "if (skill && ctx)" not in js:
    errors.append("happyPathLines only when skill && ctx — tabs closed ≠ extend existing class")
if 'id="lab-why-ctx"' not in html:
    errors.append("lab why must have a context column (lab-why-ctx)")

if errors:
    print("check-lab-wrap.py FAIL:", file=sys.stderr)
    for e in errors:
        print(f"  - {e}", file=sys.stderr)
    sys.exit(1)

print("check-lab-wrap.py ok")
