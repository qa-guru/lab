# Rule · Skill · RAG · ADR

Учебные листы A4 (альбом) для занятий 2–4 курса AI-first QA.

**Live (РФ):** [lab.qa.guru](https://lab.qa.guru/) · backup: [qa-guru.github.io/lab/](https://qa-guru.github.io/lab/). Takeaway-репо: [qa-guru/ai-first-student-workspace](https://github.com/qa-guru/ai-first-student-workspace). Клик по строке прыгает к листу **на этой же странице**.

## Итог

Промпт живёт в чате и умирает вместе с ним. Четыре файла живут в git:

| Слой | Вопрос | Где | Загрузка |
|------|--------|-----|----------|
| **Skill** | Как сделать задачу? | `docs/agent-skills/<name>/SKILL.md` | «прочитай SKILL.md» |
| **Rule** | Что нельзя всегда? | `.clinerules/`, `.cursor/rules/`, `AGENTS.md` | авто (toggle) |
| **RAG** | Откуда факт? | `docs/agent-skills/rag/<id>.md` | 2–4 пути из skill |
| **ADR** | Почему A, не B? | `docs/adr/` | skill ссылается |

Один файл на 500 строк — антипаттерн. В IDE rule включается сам; skill — по промпту; RAG — только названные чанки; ADR — «почему так», не копия skill.

Канон на одном сценарии: *неверный пароль на логине*.

- UI: `LoginTests#shouldShowErrorWhenPasswordIsWrong` + `pages/LoginPage` (`data-testid`)
- HTTP 401: `AuthApiTests#loginWithInvalidPassword`
- Команда: `./gradlew test -Denv=ci -DincludeTags=e2e -Dtest=LoginTests#shouldShowErrorWhenPasswordIsWrong`  
  Срез = `-DincludeTags` (rule 01). `@Tag("smoke")` — prod slice, не эта команда (ADR 005).

Без слоя агент типично: свой `ChromeDriver`, CSS в `*Tests`, `localhost`, full suite, commit, выдуманный `testE2e`, второй e2e «на 401». Со слоями — канон выше. Открытый код в IDE — это **сцена**, не пятый слой (иначе копипаст happy → sad).

Линейка занятий: skill → + rule (занятие 2) → + RAG (3) → + ADR (4).

Пак: [PACK.md](https://github.com/qa-guru/ai-first-student-workspace/blob/main/docs/agent-skills/PACK.md). Внешность листов — токены design-system (тёмный surface, panel chrome).

## По одной на слой + общая

- [00 · Общая карта](index.html#00-overview) — четыре вопроса, чайник = прогон e2e, quiz
- [01 · Skill](index.html#01-skills) — маршрутный лист, пак, глагол+объект
- [02 · Rule](index.html#02-rules) — ПДД, пять files takeaway
- [03 · RAG](index.html#03-rag) — 2–4 карточки, диета
- [04 · ADR](index.html#04-adr) — почему A не B, 009 логин / 005 slice / 006 note

## Login · без слоя / со слоем

Промпт: «Добавь автотест на неуспешный логин с неправильным паролем». Без «не коммить» в чате — это Rule. Слева — ответ без слоя, справа — канон.

- [20 · сценарий](index.html#20-login) — что уже в репо
- [21 · skill](index.html#21-login-skill) — ChromeDriver vs `qa-write-test`
- [22 · rule](index.html#22-login-rule) — full suite / commit vs tags + `-Denv`
- [23 · RAG](index.html#23-login-rag) — `$("input")` vs `data-testid`
- [24 · ADR](index.html#24-login-adr) — e2e на 401 vs api (ADR 009; screenshot-slice — ADR 005, другой промпт)

## Login · живой опыт (абляция)

Тот же промпт, две вкладки. Context (открытый код) всегда в кадре — не путать со слоем.

- [30 · микропроект](index.html#30-login-micro) — `LoginTests` + `LoginPage`
- [31 · полный стек](index.html#31-login-full) — канон `shouldShowErrorWhenPasswordIsWrong`
- [32 · полный − 1](index.html#32-login-minus-one) — у каждого слоя своя галлюцинация
- [33 · пары](index.html#33-login-pairs) — 2 из 4
- [34 · одиночки / пусто](index.html#34-login-singles) — 1 из 4 и «учебный интернет»
- [35 · context ≠ слой](index.html#35-login-context) — открытый канон кормит копипаст
- [36 · лаборатория](36-login-lab.html) — вкл/выкл Skill / Rule / RAG / ADR / Context, сразу видно код галлюцинации (не лист A4). Сравнение по рядам файла (test → page → …), Java — `white-space: pre` + скролл, не `pre-wrap` (`check-lab-wrap.py`).

На 36 кнопки только четыре сцены (группа «Слои»): всё включено · включен только контекст · включены только слои · все выключено. −Skill / −Rule / −RAG / −ADR и пары — тумблер слева или хэш, без пилюль.

Хэш: `c`/`s`/`r`/`g`/`a` + `0|1`, потом `u` + `c`|`l`|`a`|`x` (Cursor / Cline / Claude / Codex). Cursor = `…uc`. Клавиши `c` `s` `r` `g` `a` те же биты.

| Состояние | Хэш |
|------|-----|
| всё включено | `#c1s1r1g1a1uc` |
| включен только контекст | `#c1s0r0g0a0uc` |
| включены только слои | `#c0s1r1g1a1uc` |
| все выключено | `#c0s0r0g0a0uc` |
| − RAG | `#c1s1r1g0a1uc` |
| − Rule | `#c1s1r0g1a1uc` |
| − Skill | `#c1s0r1g1a1uc` |
| − ADR | `#c1s1r1g1a0uc` |
| Skill+Rule | `#c1s1r1g0a0uc` |
| Skill+RAG | `#c1s1r0g1a0uc` |
| Skill+ADR | `#c1s1r0g0a1uc` |
| Rule+RAG | `#c1s0r1g1a0uc` |
| Rule+ADR | `#c1s0r1g0a1uc` |
| RAG+ADR | `#c1s0r0g1a1uc` |

Контекст лабы — снимок **до дописывания** (метод комментируют, error-path в PO на вкладке нет), не текущий `develop`.

Перед live закомментируй `shouldShowErrorWhenPasswordIsWrong`. New Agent после смены слоёв. Лаборатория 36 — на проектор: выключаешь слой, краснеют строки.

## Наращивание

- [10 · skills](index.html#10-stack-skills) — только skill: есть маршрут, нет тормозов
- [11 · skills + rules](index.html#11-stack-skills-rules) — занятие 2
- [12 · + RAG](index.html#12-stack-skills-rules-rag) — занятие 3
- [13 · полный стек](index.html#13-stack-skills-rules-rag-adr) — занятие 4

## Домашка

- [40 · ДЗ · main → develop](index.html#40-homework) — два промпта, блок «Сдача ДЗ»; тексты: [HOMEWORK.md](https://github.com/qa-guru/ai-first-student-workspace/blob/main/HOMEWORK.md)

## Словарь

- [50 · словарь AI-стека](50-glossary.html) — у каждого термина два пояснения: общее и на каноне `LoginTests#shouldShowErrorWhenPasswordIsWrong` (не лист A4). Live: [lab.qa.guru/50-glossary.html](https://lab.qa.guru/50-glossary.html).
