(function () {
  "use strict";

  var LAYERS = ["ctx", "skill", "rule", "rag", "adr"];
  var HASH_TO_LAYER = { c: "ctx", s: "skill", r: "rule", g: "rag", a: "adr" };
  var LAYER_TO_HASH = { ctx: "c", skill: "s", rule: "r", rag: "g", adr: "a" };
  var LABELS = { ctx: "Context", skill: "Skill", rule: "Rule", rag: "RAG", adr: "ADR" };

  var PRESETS = [
    { id: "full", label: "всё включено", state: { ctx: true, skill: true, rule: true, rag: true, adr: true } },
    { id: "empty", label: "включен только контекст", state: { ctx: true, skill: false, rule: false, rag: false, adr: false } },
    { id: "meta", label: "включены только слои", state: { ctx: false, skill: true, rule: true, rag: true, adr: true } },
    { id: "noct", label: "все выключено", state: { ctx: false, skill: false, rule: false, rag: false, adr: false } }
  ];

  var IDES = ["cursor", "cline", "claude", "codex"];
  var IDE_TO_HASH = { cursor: "c", cline: "l", claude: "a", codex: "x" };
  var HASH_TO_IDE = { c: "cursor", l: "cline", a: "claude", x: "codex", "1": "cursor", "0": "cline" };

  var FULL = { ctx: true, skill: true, rule: true, rag: true, adr: true };
  var state = { ctx: true, skill: true, rule: true, rag: true, adr: true };
  var ide = "cursor";

  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  var KW = {
    void: 1, class: 1, new: 1, public: 1, private: 1, protected: 1, static: 1,
    final: 1, return: 1, if: 1, else: 1, extends: 1, import: 1, package: 1, true: 1,
    false: 1, null: 1, this: 1, var: 1, boolean: 1, int: 1, long: 1,
    def: 1, from: 1, assert: 1, in: 1, and: 1, or: 1, not: 1
  };

  function tok(cls, s) {
    return '<span class="tok tok--' + cls + '">' + esc(s) + "</span>";
  }

  function highlight(text) {
    var html = "";
    var i = 0;
    var n = text.length;
    while (i < n) {
      var ch = text.charAt(i);
      if (ch === "/" && text.charAt(i + 1) === "/") {
        html += tok("cmt", text.slice(i));
        break;
      }
      if (ch === "#" && (i === 0 || /\s/.test(text.charAt(i - 1)))) {
        html += tok("cmt", text.slice(i));
        break;
      }
      if (ch === '"') {
        var j = i + 1;
        while (j < n) {
          if (text.charAt(j) === "\\") {
            j += 2;
            continue;
          }
          if (text.charAt(j) === '"') {
            j++;
            break;
          }
          j++;
        }
        html += tok("str", text.slice(i, j));
        i = j;
        continue;
      }
      if (ch === "@" && /[A-Za-z]/.test(text.charAt(i + 1))) {
        var j = i + 1;
        while (j < n && /[A-Za-z0-9]/.test(text.charAt(j))) j++;
        html += tok("ann", text.slice(i, j));
        i = j;
        continue;
      }
      if (/[0-9]/.test(ch)) {
        var j = i;
        while (j < n && /[0-9]/.test(text.charAt(j))) j++;
        html += tok("num", text.slice(i, j));
        i = j;
        continue;
      }
      if (/[A-Za-z_$]/.test(ch)) {
        var j = i + 1;
        while (j < n && /[A-Za-z0-9_$]/.test(text.charAt(j))) j++;
        var w = text.slice(i, j);
        var k = j;
        while (k < n && text.charAt(k) === " ") k++;
        if (KW[w]) html += tok("kw", w);
        else if (text.charAt(k) === "(") html += tok("fn", w);
        else if (/^[A-Z]/.test(w) && (i === 0 || text.charAt(i - 1) !== "-")) html += tok("type", w);
        else html += esc(w);
        i = j;
        continue;
      }
      html += esc(ch);
      i++;
    }
    return html;
  }

  function ln(kind, text) {
    return { kind: kind, text: text };
  }

  function panel(id, title, kind, lines, extraOf, load) {
    return { id: id, title: title, kind: kind, lines: lines, extraOf: extraOf || "", load: load || "" };
  }

  function withExtras(mains, extras) {
    var out = [];
    mains.forEach(function (p) {
      out.push(p);
      extras.forEach(function (e) {
        if (e.extraOf === p.id) out.push(e);
      });
    });
    return out;
  }

  function compose(s) {
    var ctx = s.ctx;
    var skill = s.skill;
    var rule = s.rule;
    var rag = s.rag;
    var adr = s.adr;
    var n = (skill ? 1 : 0) + (rule ? 1 : 0) + (rag ? 1 : 0) + (adr ? 1 : 0);
    var holds = [];
    var holes = [];
    var cls = skill ? "LoginTests" : "LoginSadPathTests";
    var method = skill ? "shouldShowErrorWhenPasswordIsWrong" : "testWrongPassword";

    if (ctx) holds.push({ layer: "ctx", text: "открыты LoginTests, LoginPage и HomePage" });
    if (skill) holds.push({ layer: "skill", text: "дописывает LoginTests, гоняет один метод" });
    if (rule) holds.push({ layer: "rule", text: "не гоняет весь suite и сам не коммитит" });
    if (rag) holds.push({ layer: "rag", text: "data-testid, текст ошибки, @Step на методах PO" });
    if (adr) holds.push({ layer: "adr", text: "401 не трогает — уже AuthApiTests" });

    if (!ctx) {
      holes.push({
        layer: "ctx",
        text: n === 0
          ? "вкладки закрыты — не видит, что репо на Java, пишет pytest"
          : "вкладки закрыты: LoginTests с нуля, new LoginPage(), happy path не видел"
      });
    }
    if (!skill) holes.push({ layer: "skill", text: "новый класс, нет -Dtest=, DoD нет" });
    if (!rule) holes.push({ layer: "rule", text: "весь suite / testE2e, коммит, localhost в коде" });
    if (!rag) {
      holes.push({
        layer: "rag",
        text: ctx
          ? "копирует happy path, @Step на класс / пароль в шаге, не расширяет PO"
          : n === 0
            ? "селекторы с потолка, pytest"
            : "берёт $(\"input\"), Allure.step в тесте, «Invalid credentials»"
      });
    }
    if (!adr) holes.push({ layer: "adr", text: "ещё полезет e2e на 401" });

    var verdict;
    if (n === 4 && ctx) verdict = "Все слои включены. Тест как в репо.";
    else if (n === 4) verdict = "Слои вкл, вкладок нет. LoginTests из репо не видел.";
    else if (n === 0 && ctx) verdict = "Слоёв нет, вкладки открыты. Спишет happy path и повесит @Step на класс LoginPage.";
    else if (n === 0) verdict = "Ни слоёв, ни вкладок. Не понял, что это Java, написал pytest.";
    else if (!rag) {
      verdict = ctx
        ? "Без RAG копирует happy path и путает @Step: на класс, в тест, пароль в шаге."
        : "Без RAG селекторы, текст ошибки и @Step не из репо.";
    } else if (!rule) verdict = "Без rule тест ок, но полный suite / testE2e и commit без OK.";
    else if (!skill) verdict = "Без skill метод может получиться, но в новом классе и без -Dtest=.";
    else verdict = "Без ADR полезет e2e на 401.";

    function pack(panels) {
      return { panels: panels, holds: holds, holes: holes, n: n, verdict: verdict };
    }

    if (n === 0 && !ctx) {
      return pack([
        panel("test", "test · test_login.py", "bad", [
          ln("dim", "# вкладок не было, Java не увидел"),
          ln("dim", "from selenium import webdriver"),
          ln("dim", ""),
          ln("bad", "def test_wrong_password():"),
          ln("bad", "    driver = webdriver.Chrome()"),
          ln("bad", "    driver.get(\"http://localhost:3000/login\")"),
          ln("bad", "    driver.find_element(\"css selector\", \"input\").send_keys(\"admin\")"),
          ln("bad", "    driver.find_element(\"css selector\", \"#password\").send_keys(\"123\")"),
          ln("bad", "    driver.find_element(\"css selector\", \"button\").click()"),
          ln("bad", "    assert \"Invalid credentials\" in driver.page_source")
        ]),
        panel("page", "page · LoginPage.java", "bad", [
          ln("dim", "// LoginPage.java агент не видел"),
          ln("dim", ""),
          ln("dim", "// локаторы не вынес — CSS в pytest:"),
          ln("bad", "driver.find_element(\"css selector\", \"input\")"),
          ln("bad", "driver.find_element(\"css selector\", \"#password\")"),
          ln("bad", "driver.find_element(\"css selector\", \"button\")")
        ]),
        panel("home", "page · HomePage.java", "bad", [
          ln("dim", "// HomePage.java агент не видел"),
          ln("dim", ""),
          ln("bad", "// shouldHaveWelcomeMessage — не видел, откуда Welcome")
        ]),
        panel("base", "base · TestBase.java", "bad", [
          ln("dim", "// TestBase.java агент не видел"),
          ln("dim", ""),
          ln("bad", "// loginPage / Configuration — не видел")
        ]),
        panel("props", "props · ci.properties", "bad", [
          ln("dim", "# properties не видел"),
          ln("bad", "baseUrl=http://localhost:3000/"),
          ln("bad", "# -Denv= нет")
        ]),
        panel("gradle", "build · build.gradle", "bad", [
          ln("dim", "// Gradle не видел"),
          ln("bad", "# pom.xml / requirements.txt из головы"),
          ln("bad", "selenium==4.15.2"),
          ln("bad", "pytest==8.3.2")
        ]),
        // cli = шелл (#). Java open() / // — в test/page.
        panel("cli", "cli · терминал", "bad", [
          ln("bad", "pytest test_login.py"),
          ln("bad", "git commit -am \"add login test\""),
          ln("dim", ""),
          ln("bad", "# в этом репо такого файла нет")
        ]),
        panel("ci", "ci · ci.yml", "bad", [
          ln("dim", "# GitHub Actions не видел"),
          ln("bad", "name: pytest"),
          ln("bad", "jobs:"),
          ln("bad", "  e2e:"),
          ln("bad", "    steps:"),
          ln("bad", "      - run: pytest test_login.py")
        ])
      ]);
    }

    var happyPathLines = [
      ln("dim", "@Layer(\"e2e\")"),
      ln("dim", "@Epic(\"Authentication\")"),
      ln("dim", "@Feature(\"Login\")"),
      ln("dim", "class LoginTests extends TestBase {"),
      ln("dim", ""),
      ln("dim", "  @Test"),
      ln("dim", "  @Tag(\"e2e\")"),
      ln("dim", "  @Tag(\"smoke\")"),
      ln("dim", "  @Tag(\"positive\")"),
      ln("dim", "  @DisplayName(\"User is logged in with valid credentials\")"),
      ln("dim", "  void shouldLoginWithValidCredentials() {"),
      ln("dim", "    loginPage.openPage()"),
      ln("dim", "        .fillAndSubmitForm(\"user1\", \"password1\")"),
      ln("dim", "        .shouldHaveWelcomeMessage(\"Welcome, user1!\");"),
      ln("dim", "  }")
    ];

    var testLines = [];
    if (skill && ctx) {
      testLines = happyPathLines.slice();
    } else if (skill) {
      testLines.push(ln("bad", "// вкладку LoginTests не открывал — некуда дописать"));
      testLines.push(ln("dim", ""));
      testLines.push(ln("ok", "@Layer(\"e2e\")"));
      testLines.push(ln("bad", "class LoginTests {"));
      testLines.push(ln("bad", "  // extends TestBase / @Epic / happy path — не видел"));
    } else {
      testLines.push(ln("bad", "// новый файл, не LoginTests"));
      testLines.push(ln("dim", ""));
      testLines.push(ln("dim", "@Layer(\"e2e\")"));
      testLines.push(ln("bad", "class LoginSadPathTests {"));
    }

    testLines.push(ln("dim", ""));
    testLines.push(ln(skill ? "ok" : "dim", "  @Test"));
    if (skill) {
      testLines.push(ln("ok", "  @Tag(\"e2e\")"));
      testLines.push(ln("ok", "  @Tag(\"negative\")"));
    } else {
      testLines.push(ln("dim", "  @Tag(\"e2e\")"));
    }

    testLines.push(ln(skill ? "ok" : "dim", "  @DisplayName(\"Wrong password shows readable error\")"));
    if (!rag) {
      testLines.push(ln("bad", "  @Step(\"Wrong password\")"));
      testLines.push(ln("bad", "  // @Step на @Test — в каноне на PO"));
    }
    testLines.push(ln(skill ? "ok" : "dim", "  void " + method + "() {"));

    if (skill && !ctx) {
      testLines.push(ln("bad", "    LoginPage loginPage = new LoginPage();"));
      testLines.push(ln("bad", "    // TestBase не открывал — loginPage не поле"));
    }

    if (rag) {
      if (!rule) {
        testLines.push(ln("bad", "    open(\"http://localhost:9821/login\");"));
        testLines.push(ln("ok", "    loginPage.typeUsername(\"user1\")"));
      } else {
        testLines.push(ln("ok", "    loginPage.openPage()"));
        testLines.push(ln("ok", "        .typeUsername(\"user1\")"));
      }
      testLines.push(ln("ok", "        .typePassword(\"wrongpassword\")"));
      testLines.push(ln("ok", "        .submitExpectingError()"));
      testLines.push(ln("ok", "        .shouldHaveErrorMessage(\"Wrong login or password\");"));
    } else if (ctx) {
      if (!rule) {
        testLines.push(ln("bad", "    open(\"http://localhost:9821/login\");"));
        testLines.push(ln("bad", "    loginPage.fillAndSubmitForm(\"user1\", \"wrongpassword\")"));
      } else {
        testLines.push(ln("bad", "    loginPage.openPage()"));
        testLines.push(ln("bad", "        .fillAndSubmitForm(\"user1\", \"wrongpassword\")"));
      }
      testLines.push(ln("bad", "        .shouldHaveWelcomeMessage(\"Welcome, user1!\");"));
      testLines.push(ln("dim", "    // открыт happy path, sad path срисован оттуда"));
      testLines.push(ln("bad", "    // или: $(\".alert\").shouldHave(text(\"Invalid credentials\"));"));
    } else if (skill) {
      if (!rule) {
        testLines.push(ln("bad", "    open(\"http://localhost:9821/login\");"));
        testLines.push(ln("bad", "    loginPage.setUser(\"user1\").setPass(\"123\").clickLogin();"));
      } else {
        testLines.push(ln("bad", "    loginPage.openPage()"));
        testLines.push(ln("bad", "        .setUser(\"user1\").setPass(\"123\").clickLogin();"));
      }
      testLines.push(ln("bad", "    Allure.step(\"invalid login\");"));
      testLines.push(ln("bad", "    $(\".alert\").shouldHave(text(\"Invalid credentials\"));"));
    } else {
      testLines.push(ln("bad", "    WebDriver d = new ChromeDriver();"));
      if (!rule) testLines.push(ln("bad", "    d.get(\"http://localhost:9821/login\");"));
      else {
        testLines.push(ln("ok", "    open(\"/login\");"));
        testLines.push(ln("ok", "    // URL не в Java"));
      }
      testLines.push(ln("bad", "    Allure.step(\"fill inputs\");"));
      testLines.push(ln("bad", "    $(\"input\").setValue(\"user1\");"));
      testLines.push(ln("bad", "    $(\"input[type=password]\").setValue(\"wrong\");"));
      testLines.push(ln("bad", "    $(\"button\").click();"));
      testLines.push(ln("bad", "    assertEquals(\"Invalid credentials\", $(\".err\").text());"));
    }

    testLines.push(ln("dim", "  }"));
    testLines.push(ln("dim", "}"));

    var pageLines;
    var pageKind;
    if (rag && ctx) {
      pageKind = "ok";
      pageLines = [
        ln("dim", "class LoginPage {"),
        ln("dim", ""),
        ln("dim", "  loginInput    = $(\"[data-testid='login-input']\");"),
        ln("dim", "  passwordInput = $(\"[data-testid='password-input']\");"),
        ln("dim", "  submitButton  = $(\"[data-testid='submit-button']\");"),
        ln("ok", "  errorMessage  = $(\"[data-testid='error-message']\");"),
        ln("dim", ""),
        ln("dim", "  @Step(\"Open login page\")"),
        ln("dim", "  LoginPage openPage() {"),
        ln("dim", "    open(\"/login\");"),
        ln("dim", "    return this;"),
        ln("dim", "  }"),
        ln("dim", ""),
        ln("dim", "  @Step(\"Fill and submit form\")"),
        ln("dim", "  HomePage fillAndSubmitForm(String username, String password) {"),
        ln("dim", "    typeUsername(username).typePassword(password).submit();"),
        ln("dim", "    return new HomePage();"),
        ln("dim", "  }"),
        ln("dim", ""),
        ln("dim", "  @Step(\"Type username: {username}\")"),
        ln("dim", "  LoginPage typeUsername(String username) {"),
        ln("dim", "    loginInput.setValue(username);"),
        ln("dim", "    return this;"),
        ln("dim", "  }"),
        ln("dim", ""),
        ln("dim", "  @Step(\"Type password\")"),
        ln("dim", "  LoginPage typePassword(String password) {"),
        ln("dim", "    passwordInput.setValue(password);"),
        ln("dim", "    return this;"),
        ln("dim", "  }"),
        ln("dim", ""),
        ln("ok", "  @Step(\"Submit expecting error\")"),
        ln("ok", "  LoginPage submitExpectingError() {"),
        ln("ok", "    submitButton.click();"),
        ln("ok", "    errorMessage.shouldBe(visible);"),
        ln("ok", "    return this;"),
        ln("dim", "  }"),
        ln("dim", ""),
        ln("ok", "  @Step(\"Verify error: {message}\")"),
        ln("ok", "  LoginPage shouldHaveErrorMessage(String message) {"),
        ln("ok", "    errorMessage.shouldHave(text(message));"),
        ln("ok", "    return this;"),
        ln("dim", "  }"),
        ln("dim", "}")
      ];
    } else if (rag) {
      pageKind = "bad";
      pageLines = [
        ln("bad", "// вкладку LoginPage не открывал — собрал по RAG"),
        ln("dim", "class LoginPage {"),
        ln("dim", ""),
        ln("ok", "  loginInput    = $(\"[data-testid='login-input']\");"),
        ln("ok", "  passwordInput = $(\"[data-testid='password-input']\");"),
        ln("ok", "  submitButton  = $(\"[data-testid='submit-button']\");"),
        ln("ok", "  errorMessage  = $(\"[data-testid='error-message']\");"),
        ln("dim", ""),
        ln("ok", "  @Step(\"Open login page\")"),
        ln("ok", "  LoginPage openPage() {"),
        ln("ok", "    open(\"/login\");"),
        ln("ok", "    return this;"),
        ln("ok", "  }"),
        ln("dim", ""),
        ln("ok", "  @Step(\"Type username: {username}\")"),
        ln("ok", "  LoginPage typeUsername(String username) {"),
        ln("ok", "    loginInput.setValue(username);"),
        ln("ok", "    return this;"),
        ln("ok", "  }"),
        ln("dim", ""),
        ln("ok", "  @Step(\"Type password\")"),
        ln("ok", "  LoginPage typePassword(String password) {"),
        ln("ok", "    passwordInput.setValue(password);"),
        ln("ok", "    return this;"),
        ln("ok", "  }"),
        ln("dim", ""),
        ln("ok", "  @Step(\"Submit expecting error\")"),
        ln("ok", "  LoginPage submitExpectingError() {"),
        ln("ok", "    submitButton.click();"),
        ln("ok", "    errorMessage.shouldBe(visible);"),
        ln("ok", "    return this;"),
        ln("ok", "  }"),
        ln("dim", ""),
        ln("ok", "  @Step(\"Verify error: {message}\")"),
        ln("ok", "  LoginPage shouldHaveErrorMessage(String message) {"),
        ln("ok", "    errorMessage.shouldHave(text(message));"),
        ln("ok", "    return this;"),
        ln("ok", "  }"),
        ln("dim", ""),
        ln("bad", "  // fillAndSubmitForm как в репо — не видел"),
        ln("dim", "}")
      ];
    } else if (ctx) {
      pageKind = "bad";
      pageLines = [
        ln("bad", "@Epic(\"Authentication\")"),
        ln("bad", "@Step()"),
        ln("bad", "// аннотации с LoginTests, пустой @Step на классе"),
        ln("dim", "class LoginPage {"),
        ln("dim", ""),
        ln("dim", "  HomePage fillAndSubmitForm(String username, String password) {"),
        ln("dim", "    typeUsername(username).typePassword(password).submit();"),
        ln("dim", "    return new HomePage();"),
        ln("dim", "  }"),
        ln("dim", ""),
        ln("bad", "  @Step(\"Type password: {password}\")"),
        ln("bad", "  // пароль в Allure — в каноне без {password}"),
        ln("dim", ""),
        ln("bad", "  // errorMessage — не добавил"),
        ln("bad", "  // submitExpectingError() — не добавил"),
        ln("bad", "  // @Step на error-path — не добавил"),
        ln("dim", "}")
      ];
    } else if (skill) {
      pageKind = "bad";
      pageLines = [
        ln("bad", "@Step()"),
        ln("bad", "// на классе и пустой — в каноне на методах"),
        ln("bad", "class LoginPage {"),
        ln("dim", ""),
        ln("bad", "  LoginPage setUser(String username) {"),
        ln("bad", "    $(\"#login\").setValue(username);"),
        ln("bad", "    return this;"),
        ln("dim", "  }"),
        ln("bad", "  LoginPage setPass(String password) {"),
        ln("bad", "    $(\"#password\").setValue(password);"),
        ln("bad", "    return this;"),
        ln("dim", "  }"),
        ln("bad", "  void clickLogin() {"),
        ln("bad", "    Allure.step(\"click\");"),
        ln("bad", "    $(\"button\").click();"),
        ln("dim", "  }"),
        ln("dim", "}")
      ];
    } else {
      pageKind = "bad";
      pageLines = [
        ln("dim", "// локаторы не вынес — CSS в *Tests:"),
        ln("bad", "$(\"input\")"),
        ln("bad", "$(\"input[type=password]\")"),
        ln("bad", "$(\"button\")"),
        ln("bad", "$(\".err\")"),
        ln("dim", ""),
        ln("bad", "Allure.step(\"fill form\")"),
        ln("bad", "// шаг в тесте, PO нет")
      ];
    }

    var homeKind;
    var homeLines;
    if (ctx) {
      homeKind = "ok";
      homeLines = [
        ln("dim", "class HomePage {"),
        ln("dim", ""),
        ln("dim", "  welcomeMessage = $(\"[data-testid='welcome-message']\");"),
        ln("dim", ""),
        ln("dim", "  @Step(\"Verify welcome message: {message}\")"),
        ln("dim", "  HomePage shouldHaveWelcomeMessage(String message) {"),
        ln("dim", "    welcomeMessage.shouldHave(text(message));"),
        ln("dim", "    return this;"),
        ln("dim", "  }"),
        ln("dim", "}")
      ];
    } else {
      homeKind = "bad";
      homeLines = [
        ln("bad", "// shouldHaveWelcomeMessage — не видел, откуда Welcome")
      ];
    }

    var baseKind;
    var baseLines;
    if (ctx) {
      baseKind = "ok";
      baseLines = [
        ln("dim", "protected LoginPage loginPage = new LoginPage();"),
        ln("dim", ""),
        ln("dim", "@BeforeAll"),
        ln("dim", "static void setup() {"),
        ln("dim", "  Configuration.baseUrl = ConfigReader.resolveWebBaseUrl();"),
        ln("dim", "  Configuration.browser = config.browser();"),
        ln("dim", "  Configuration.browserSize = config.browserSize();"),
        ln("dim", "  Configuration.headless = config.headless();"),
        ln("dim", "}"),
        ln("dim", "// не new ChromeDriver() в тесте")
      ];
    } else {
      baseKind = "bad";
      baseLines = [
        ln("bad", "// loginPage / Configuration — не видел")
      ];
    }

    // cli · терминал = шелл (#). Java open() / // — в test/page, не сюда.
    var runLines = [];
    if (rule && skill) {
      runLines.push(ln("ok", "cd tests/java/tests-java-gradle-junit5-allure3-selenide"));
      runLines.push(ln("ok", "./gradlew test -Denv=ci -DincludeTags=e2e \\"));
      runLines.push(ln("ok", "  -Dtest=" + cls + "#" + method));
    } else if (rule) {
      runLines.push(ln("ok", "./gradlew test -Denv=ci -DincludeTags=e2e"));
      runLines.push(ln("bad", "# весь срез e2e — нет -Dtest=Class#method"));
    } else {
      runLines.push(ln("bad", "./gradlew test                         # full suite"));
      runLines.push(ln("bad", "./gradlew testE2e                      # такого task нет"));
    }

    if (!rule) {
      runLines.push(ln("bad", "git commit -am \"login\"                 # без OK"));
    }

    runLines.push(ln("dim", ""));
    if (n === 4 && ctx) {
      runLines.push(ln("ok", "# e2e · pipeline / stage / prod · exit 0 · нет commit"));
      runLines.push(ln("ok", "# 401 уже в AuthApiTests#loginWithInvalidPassword"));
    } else if (n === 4) {
      runLines.push(ln("bad", "# слои сказали как гонять, LoginTests не видел"));
      runLines.push(ln("ok", "# 401 уже в AuthApiTests#loginWithInvalidPassword"));
    } else if (skill) {
      runLines.push(ln("ok", "# skill: слой, стенды, exit"));
      if (!adr) runLines.push(ln("bad", "# и ещё e2e на JSON «на всякий»"));
    } else {
      runLines.push(ln("bad", "# не сказал ни слой, ни стенды, ни exit"));
      if (rag && !adr) runLines.push(ln("bad", "# api прикрутил в тот же чат"));
    }

    var gradleLines;
    var gradleKind;
    if (rule) {
      gradleKind = "ok";
      gradleLines = [
        ln("ok", "javaVersion     = 21"),
        ln("ok", "junitVersion    = '5.11.4'"),
        ln("ok", "selenideVersion = '7.17.0'"),
        ln("ok", "allureVersion   = '3.13.0'"),
        ln("ok", "ownerVersion    = '1.0.12'"),
        ln("dim", ""),
        ln("ok", "testImplementation ("),
        ln("ok", "  \"com.codeborne:selenide:${selenideVersion}\","),
        ln("ok", "  \"org.junit.jupiter:junit-jupiter:${junitVersion}\","),
        ln("ok", "  \"io.qameta.allure:allure-selenide\","),
        ln("ok", "  \"org.aeonbits.owner:owner:${ownerVersion}\""),
        ln("ok", ")"),
        ln("dim", ""),
        ln("ok", "test {"),
        ln("ok", "  useJUnitPlatform {"),
        ln("ok", "    def includeTagsProp = System.getProperty('includeTags')"),
        ln("ok", "    if (includeTagsProp) {"),
        ln("ok", "      includeTags(*(includeTagsProp.split(',')*.trim()))"),
        ln("ok", "    }"),
        ln("ok", "    def excludeTagsProp = System.getProperty('excludeTags')"),
        ln("ok", "    if (excludeTagsProp) {"),
        ln("ok", "      excludeTags(*(excludeTagsProp.split(',')*.trim()))"),
        ln("ok", "    }"),
        ln("ok", "  }"),
        ln("ok", "  systemProperty 'env', testEnv"),
        ln("ok", "}")
      ];
    } else {
      gradleKind = "bad";
      gradleLines = [
        ln("bad", "task testE2e(type: Test) { useJUnitPlatform() }"),
        ln("dim", ""),
        ln("dim", "// в репо срез = -DincludeTags, не отдельный task:"),
        ln("ok", "test {"),
        ln("ok", "  useJUnitPlatform {"),
        ln("ok", "    def includeTagsProp = System.getProperty('includeTags')"),
        ln("ok", "    if (includeTagsProp) {"),
        ln("ok", "      includeTags(*(includeTagsProp.split(',')*.trim()))"),
        ln("ok", "    }"),
        ln("ok", "  }"),
        ln("ok", "  systemProperty 'env', testEnv"),
        ln("ok", "}")
      ];
    }

    var propsKind = "ok";
    var propsLines = [
      ln("ok", "baseUrl=http://localhost:9821/"),
      ln("ok", "browser=chrome"),
      ln("ok", "browserVersion=148"),
      ln("ok", "browserSize=1920x1280"),
      ln("ok", "headless=true")
    ];

    var ciKind;
    var ciLines;
    if (rule) {
      ciKind = "ok";
      ciLines = [
        ln("ok", "e2e-tests:"),
        ln("ok", "  env:"),
        ln("ok", "    LAYER: e2e"),
        ln("ok", "  steps:"),
        ln("ok", "    - uses: ./tests/.github/actions/e2e"),
        ln("ok", "      with:"),
        ln("ok", "        stand: prod"),
        ln("ok", "# ./gradlew test -Denv=prod"),
        ln("ok", "#   -DincludeTags=e2e"),
        ln("ok", "#   -DexcludeTags=mock,screenshot"),
        ln("ok", "# task testE2e нет")
      ];
    } else {
      ciKind = "bad";
      ciLines = [
        ln("bad", "e2e:"),
        ln("bad", "  steps:"),
        ln("bad", "    - run: ./gradlew testE2e"),
        ln("dim", ""),
        ln("dim", "# в репо:"),
        ln("ok", "e2e-tests:"),
        ln("ok", "  steps:"),
        ln("ok", "    - uses: ./tests/.github/actions/e2e"),
        ln("ok", "# task testE2e нет")
      ];
    }

    var extras = [];
    if (!skill) {
      extras.push(panel("extra-test", "test · LoginSadPathTests.java", "bad", testLines, "test"));
    }
    if (!adr) {
      extras.push(panel("extra-test-401", "test · Login401Tests.java", "bad", [
        ln("bad", "// нет ADR 009 — второй e2e «на 401»"),
        ln("dim", "// уже есть AuthApiTests#loginWithInvalidPassword"),
        ln("dim", ""),
        ln("bad", "@Layer(\"e2e\")"),
        ln("bad", "class Login401Tests {"),
        ln("dim", ""),
        ln("bad", "  @Test"),
        ln("bad", "  void shouldSee401() {"),
        ln("bad", "    $(\"pre\").shouldHave(text(\"401\"));"),
        ln("dim", "  }"),
        ln("dim", "}")
      ], "test"));
    }

    var mainTestLines;
    var mainTestKind;
    if (skill) {
      mainTestKind = rag && rule && ctx ? "ok" : "bad";
      mainTestLines = testLines;
    } else if (!ctx) {
      mainTestKind = "bad";
      mainTestLines = [
        ln("bad", "// LoginTests.java не видел"),
        ln("dim", ""),
        ln("bad", "// shouldShowErrorWhenPasswordIsWrong — не добавил")
      ];
    } else {
      mainTestKind = "bad";
      mainTestLines = happyPathLines.concat([
        ln("bad", "  // shouldShowErrorWhenPasswordIsWrong — не добавил"),
        ln("dim", "}")
      ]);
    }

    var testLoad = skill
      ? (ctx ? "расширил существующий класс" : "написал LoginTests по skill, вкладку не открывал")
      : (ctx ? "не расширил существующий класс" : "LoginTests не открывал");
    var pageLoad = rag
      ? (ctx ? "расширил LoginPage · @Step на методах" : "собрал LoginPage по RAG, вкладку не открывал")
      : ctx
        ? "не расширил LoginPage — срисовал happy path"
        : skill
          ? "навыдумал PO — локаторы не вынес"
          : "LoginPage не открывал";
    var homeLoad = ctx ? "не трогал — Welcome уже на HomePage" : "HomePage не открывал";
    var baseLoad = ctx ? "не трогал — loginPage уже в TestBase" : "TestBase не открывал";
    var propsLoad = "не трогал — URL не в Java";
    var gradleLoad = rule ? "не трогал — как в репо" : "навыдумал task testE2e — в репо его нет";
    var cliLoad = "прогон из шелла, не Java";
    var ciLoad = rule
      ? "не трогал — два флага"
      : "навыдумал job testE2e";

    var panels = withExtras([
      panel("test", "test · LoginTests.java", mainTestKind, mainTestLines, "", testLoad),
      panel("page", "page · LoginPage.java", pageKind, pageLines, "", pageLoad),
      panel("home", "page · HomePage.java", homeKind, homeLines, "", homeLoad),
      panel("base", "base · TestBase.java", baseKind, baseLines, "", baseLoad),
      panel("props", "props · ci.properties", propsKind, propsLines, "", propsLoad),
      panel("gradle", "build · build.gradle", gradleKind, gradleLines, "", gradleLoad),
      panel("cli", "cli · терминал", rule && skill ? "ok" : "bad", runLines, "", cliLoad),
      panel("ci", "ci · ci.yml", ciKind, ciLines, "", ciLoad)
    ], extras);

    return pack(panels);
  }

  function parseHash() {
    var h = (location.hash || "").replace(/^#/, "");
    if (!h) return null;
    var next = { ctx: true, skill: true, rule: true, rag: true, adr: true };
    var found = false;
    var nextIde = null;
    Object.keys(HASH_TO_LAYER).forEach(function (ch) {
      var i = h.indexOf(ch);
      if (i < 0 || i === h.length - 1) return;
      var bit = h.charAt(i + 1);
      if (bit !== "0" && bit !== "1") return;
      next[HASH_TO_LAYER[ch]] = bit === "1";
      found = true;
    });
    var ui = h.indexOf("u");
    if (ui >= 0 && ui < h.length - 1) {
      var ubit = h.charAt(ui + 1);
      if (HASH_TO_IDE[ubit]) {
        nextIde = HASH_TO_IDE[ubit];
        found = true;
      }
    }
    return found ? { layers: next, ide: nextIde } : null;
  }

  function writeHash() {
    var h = LAYERS.map(function (k) {
      return LAYER_TO_HASH[k] + (state[k] ? "1" : "0");
    }).join("") + "u" + (IDE_TO_HASH[ide] || "c");
    if (history.replaceState) history.replaceState(null, "", "#" + h);
  }

  function pill(layer, on) {
    var cls = "chip chip--" + layer + (on ? " chip--on" : "");
    return '<span class="' + cls + '">' + LABELS[layer] + "</span>";
  }

  function paintLines(lines) {
    // .lab-ln is display:block — joining lines with a newline inside <pre> doubles blank lines.
    return lines
      .map(function (l) {
        return '<span class="lab-ln lab-ln--' + l.kind + '">' + highlight(l.text) + "</span>";
      })
      .join("");
  }

  function explain(s) {
    var n = (s.skill ? 1 : 0) + (s.rule ? 1 : 0) + (s.rag ? 1 : 0) + (s.adr ? 1 : 0);
    var match = n === 4 && s.ctx;
    var gaps = [];
    if (!s.ctx) {
      gaps.push({
        layer: "ctx",
        title: n === 0 ? "не увидел, что это Java" : "не видел LoginTests",
        ideal: "Открыты LoginTests, LoginPage, HomePage. На вкладке LoginPage нет errorMessage и submitExpectingError.",
        expected: n === 0
          ? "pytest + ChromeDriver + localhost:3000. В этом репо такого файла нет."
          : "Класс с нуля, new LoginPage(), happy path не сохранил.",
        why: n === 0
          ? "Вкладки закрыты — не видно, что репо на Java."
          : "Слои без вкладок: есть шаги, нет файла из репо."
      });
    }
    if (!s.skill) {
      gaps.push({
        layer: "skill",
        title: "новый класс, без -Dtest=",
        ideal: "Дописал LoginTests#shouldShowErrorWhenPasswordIsWrong. Прогон: -Dtest=LoginTests#метод.",
        expected: "Новый LoginSadPathTests / testWrongPassword. Срез e2e без -Dtest=.",
        why: "Не сказано «допиши в LoginTests» и как гонять один метод."
      });
    }
    if (!s.rule) {
      gaps.push({
        layer: "rule",
        title: "весь suite, testE2e, commit, URL в Java",
        ideal: "Не commit / push без OK. URL из properties. Всегда -Denv=. Нет task testE2e.",
        expected: "git commit сам. ./gradlew test на весь suite или выдуманный testE2e. localhost в Java.",
        why: "«Не коммить» в промпте нет — это rule."
      });
    }
    if (!s.rag) {
      var ragExpected;
      if (s.ctx) {
        ragExpected = "fillAndSubmitForm(\"user1\", \"wrongpassword\") и Welcome. @Step() на класс LoginPage, пароль в шаге. Или $(\".alert\") + «Invalid credentials».";
      } else if (n === 0) {
        ragExpected = "driver.find_element(\"input\"), assert «Invalid credentials».";
      } else {
        ragExpected = "$(\"input\") / $(\"#login\"), Allure.step в тесте, «Invalid credentials».";
      }
      gaps.push({
        layer: "rag",
        title: s.ctx ? "срисовал happy path и перепутал @Step" : (n === 0 ? "селекторы с потолка, pytest" : "выдумал CSS и текст ошибки"),
        ideal: "В LoginPage: errorMessage, submitExpectingError, @Step на методах. Текст «Wrong login or password».",
        expected: ragExpected,
        why: s.ctx
          ? "На вкладке happy path — его и повесил на неверный пароль."
          : "Нет po-locators / test-negative — селектор и текст ошибки не из репо."
      });
    }
    if (!s.adr) {
      gaps.push({
        layer: "adr",
        title: "e2e на 401",
        ideal: "401 JSON уже в AuthApiTests#loginWithInvalidPassword. Этот e2e — текст на форме.",
        expected: "Ещё Login401Tests: $(\"pre\").shouldHave(text(\"401\")).",
        why: "Промпт про неверный пароль — 401 агент додумает сам."
      });
    }
    return { match: match, gaps: gaps, n: n };
  }

  function paintPanels(el, panels, extra) {
    if (!el) return;
    el.classList.toggle("is-extra", !!extra);
    el.innerHTML = panels
      .map(function (p) {
        var cls = "panel lab-file" + (p.kind === "ok" ? " panel--good" : " panel--bad") + (p.extraOf ? " lab-file--extra" : "");
        return (
          '<section class="' + cls + '" data-slot="' + p.id + '"' + (p.extraOf ? ' data-extra="' + p.extraOf + '"' : "") + '>' +
            '<header class="panel__bar">' +
              '<span class="dots"><i class="dot dot--r"></i><i class="dot dot--y"></i><i class="dot dot--g"></i></span>' +
              '<p class="panel__title">' + esc(p.title) + "</p>" +
            "</header>" +
            '<div class="panel__body lab-code-wrap">' +
              (p.load ? '<p class="lab-src__load">' + esc(p.load) + "</p>" : "") +
              '<pre class="lab-code">' + paintLines(p.lines) + "</pre>" +
            "</div>" +
          "</section>"
        );
      })
      .join("");
  }

  function holdsHtml(holds, sub) {
    if (!holds.length) return "";
    return (
      '<div class="lab-why__holds">' +
      '<h3 class="lab-why__sub">' +
      sub +
      "</h3><ul class=\"lab-list\">" +
      holds
        .map(function (item) {
          return "<li>" + pill(item.layer, true) + " " + esc(item.text) + "</li>";
        })
        .join("") +
      "</ul></div>"
    );
  }

  function onLayersLead(s) {
    var parts = [];
    if (s.skill) parts.push("Skill");
    if (s.rule) parts.push("Rule");
    if (s.rag) parts.push("RAG");
    if (s.adr) parts.push("ADR");
    var tabs = s.ctx ? "Вкладки открыты" : "Вкладки закрыты";
    if (parts.length === 4 && s.ctx) {
      return "Вкладки открыты, Skill / Rule / RAG / ADR вкл.";
    }
    if (!parts.length) return tabs + ", слоёв нет.";
    return tabs + ", вкл: " + parts.join(" / ") + ".";
  }

  function paintIdealWhy(el, holds) {
    if (!el) return;
    el.innerHTML = holdsHtml(holds, "что держит");
  }

  function gapCard(g, skipIdeal) {
    return (
      '<article class="lab-gap lab-gap--' + g.layer + '">' +
        '<header class="lab-gap__hd">' + pill(g.layer, false) +
          '<h3 class="lab-gap__title">' + esc(g.title) + "</h3></header>" +
        (skipIdeal ? "" : '<p class="lab-gap__ideal"><span>идеал</span> ' + esc(g.ideal) + "</p>") +
        '<p class="lab-gap__got"><span>ожидаемо</span> ' + esc(g.expected) + "</p>" +
        '<p class="lab-gap__why">' + esc(g.why) + "</p>" +
      "</article>"
    );
  }

  function paintCtxWhy(el, s, why) {
    if (!el) return;
    if (s.ctx) {
      el.innerHTML = holdsHtml(
        [{ layer: "ctx", text: "открыты LoginTests, LoginPage и HomePage" }],
        "что видит"
      );
      return;
    }
    var g = why.gaps.filter(function (x) { return x.layer === "ctx"; })[0];
    el.innerHTML = g ? '<div class="lab-why__gaps">' + gapCard(g, true) + "</div>" : "";
  }

  function paintWhy(el, why) {
    if (!el) return;
    var gaps = why.gaps.filter(function (g) { return g.layer !== "ctx"; });
    var html = "";
    if (!why.match && !gaps.length) {
      html += '<p class="lab-why__note">Четыре слоя вкл. Вкладок нет — нет LoginTests из репо.</p>';
    }
    if (gaps.length) {
      html +=
        '<div class="lab-why__gaps">' +
        gaps.map(function (g) { return gapCard(g, true); }).join("") +
        "</div>";
    }
    el.innerHTML = html;
  }

  var SLOTS = ["test", "page", "home", "base", "props", "gradle", "cli", "ci"];

  function panelsForSlot(panels, slot) {
    return panels.filter(function (p) {
      return p.id === slot || p.extraOf === slot;
    });
  }

  function paintSide(side, panels) {
    SLOTS.forEach(function (slot) {
      var cell = document.querySelector('.lab-cell--' + side + '[data-slot="' + slot + '"]');
      var mine = panelsForSlot(panels, slot);
      paintPanels(cell, mine, mine.some(function (p) { return !!p.extraOf; }));
    });
  }

  function render() {
    var out = compose(state);
    var ideal = compose(FULL);
    var why = explain(state);
    var whyEl = document.getElementById("lab-why");
    var whyIdealEl = document.getElementById("lab-why-ideal");
    var whyCtxEl = document.getElementById("lab-why-ctx");
    var expectedLead = document.getElementById("lab-why-expected-lead");
    var whyDiag = document.getElementById("lab-why-diag");
    var ctxDiag = document.getElementById("lab-why-ctx-diag");
    var count = document.getElementById("lab-count");
    var expectedCol = document.getElementById("lab-expected-col");
    var whyCol = document.getElementById("lab-why-col");
    var ctxCol = document.getElementById("lab-why-ctx-col");

    paintSide("ideal", ideal.panels);
    paintSide("expected", out.panels);
    paintIdealWhy(whyIdealEl, ideal.holds);
    paintCtxWhy(whyCtxEl, state, why);
    paintWhy(whyEl, why);
    if (expectedLead) expectedLead.textContent = onLayersLead(state);

    if (expectedCol) expectedCol.classList.toggle("is-match", why.match);
    if (whyCol) whyCol.classList.toggle("is-match", why.match);
    if (ctxCol) ctxCol.classList.toggle("is-off", !state.ctx);

    if (ctxDiag) {
      ctxDiag.textContent = state.ctx ? "читает вкладки." : "вкладки закрыты.";
      ctxDiag.classList.toggle("is-ok", !!state.ctx);
      ctxDiag.classList.toggle("is-bad", !state.ctx);
    }

    if (whyDiag) {
      whyDiag.textContent = out.verdict;
      whyDiag.classList.toggle("is-ok", why.match);
      whyDiag.classList.toggle("is-bad", !why.match);
    }

    if (count) count.textContent = out.n + " из 4, вкладки " + (state.ctx ? "открыты" : "закрыты");

    document.querySelectorAll("[data-src]").forEach(function (el) {
      var on = !!state[el.getAttribute("data-src")];
      el.classList.toggle("is-off", !on);
      el.classList.toggle("panel--bad", !on);
      var st = el.querySelector(".lab-src__state");
      if (st) st.textContent = on ? "читает" : "не читает";
    });

    document.querySelectorAll("[data-layer]").forEach(function (btn) {
      var on = !!state[btn.getAttribute("data-layer")];
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      btn.classList.toggle("is-on", on);
    });

    document.querySelectorAll("[data-preset]").forEach(function (btn) {
      var id = btn.getAttribute("data-preset");
      var preset = PRESETS.filter(function (p) { return p.id === id; })[0];
      var match = preset && LAYERS.every(function (k) { return state[k] === preset.state[k]; });
      btn.classList.toggle("is-on", !!match);
    });

    var screen = document.querySelector(".lab-screen");
    if (screen) screen.setAttribute("data-rule-ide", ide);
    document.querySelectorAll("button[data-rule-ide]").forEach(function (btn) {
      var on = btn.getAttribute("data-rule-ide") === ide;
      btn.classList.toggle("is-on", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });

    writeHash();
    syncDock();
  }

  function syncDock() {
    var dock = document.querySelector(".lab-dock");
    var screen = document.querySelector(".lab-screen");
    if (!dock || !screen) return;
    screen.style.setProperty("--lab-dock-h", dock.offsetHeight + "px");
  }

  function apply(next) {
    LAYERS.forEach(function (k) {
      state[k] = !!next[k];
    });
    render();
  }

  function unpinAll() {
    document.querySelectorAll(".lab-src.is-pinned").forEach(function (el) {
      el.classList.remove("is-pinned");
    });
  }

  function bind() {
    document.querySelectorAll("[data-layer]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var k = btn.getAttribute("data-layer");
        state[k] = !state[k];
        render();
      });
    });
    document.querySelectorAll("[data-preset]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-preset");
        var preset = PRESETS.filter(function (p) { return p.id === id; })[0];
        if (preset) apply(preset.state);
      });
    });
    document.querySelectorAll("button[data-rule-ide]").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        var next = btn.getAttribute("data-rule-ide");
        if (IDES.indexOf(next) < 0) return;
        ide = next;
        render();
      });
    });
    document.querySelectorAll("[data-src]").forEach(function (el) {
      el.addEventListener("click", function () {
        var k = el.getAttribute("data-src");
        state[k] = !state[k];
        render();
      });
    });
    document.querySelectorAll(".lab-src__hd").forEach(function (hd) {
      hd.setAttribute("tabindex", "0");
      function pinFromHd() {
        var src = hd.closest(".lab-src");
        if (!src) return;
        var on = src.classList.contains("is-pinned");
        unpinAll();
        if (!on) src.classList.add("is-pinned");
      }
      hd.addEventListener("click", function (e) {
        e.stopPropagation();
        pinFromHd();
      });
      hd.addEventListener("keydown", function (e) {
        if (e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault();
        e.stopPropagation();
        pinFromHd();
      });
    });
    document.querySelectorAll(".lab-src__pop").forEach(function (pop) {
      pop.addEventListener("click", function (e) {
        e.stopPropagation();
      });
    });
    document.addEventListener("click", function () {
      unpinAll();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        unpinAll();
        var ae = document.activeElement;
        if (ae && ae.classList && ae.classList.contains("lab-src__hd")) ae.blur();
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      var k = HASH_TO_LAYER[e.key.toLowerCase()];
      if (!k) return;
      e.preventDefault();
      state[k] = !state[k];
      render();
    });
  }

  function paintStatic() {
    document.querySelectorAll(".lab-src pre").forEach(function (pre) {
      if (pre.getAttribute("data-painted")) return;
      pre.setAttribute("data-painted", "1");
      pre.classList.add("lab-code");
      var raw = pre.textContent.replace(/\n$/, "");
      pre.innerHTML = raw.split("\n").map(function (line) {
        return '<span class="lab-ln">' + highlight(line) + "</span>";
      }).join(""); // not a newline join: .lab-ln is already a block line
    });
  }

  var fromHash = parseHash();
  if (fromHash) {
    LAYERS.forEach(function (k) {
      state[k] = !!fromHash.layers[k];
    });
    if (fromHash.ide) ide = fromHash.ide;
  }
  paintStatic();
  bind();
  window.addEventListener("resize", syncDock);
  render();
})();
