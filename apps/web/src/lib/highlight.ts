// A tiny syntax highlighter for the code in bug autopsies and drills: keywords, types,
// calls, strings, numbers and comments for the LeetCode languages. Line by line, carrying
// only block-comment and triple-quote state, so it costs a few hundred bytes, not a library.

export type TokenKind = "kw" | "type" | "fn" | "str" | "num" | "com" | "op" | "plain";
export type Token = { text: string; kind: TokenKind };

const PY_KW = new Set(
  "and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield None True False self".split(
    " ",
  ),
);
const C_KW = new Set(
  "auto break case catch class const constexpr continue default delete do else enum explicit extends final finally for friend func go goto if implements import in instanceof interface let fn match mut namespace new nil null nullptr package private protected public pub return static struct super switch this throw throws try typedef typename union use using var virtual void volatile while yield true false impl loop mod ref self Self elif range defer chan select fallthrough type override val when is as".split(
    " ",
  ),
);
const TYPES = new Set(
  "int long short char bool boolean byte float double string String size_t uint int64 int32 i32 i64 u32 u64 usize isize f64 f32 vector map set unordered_map unordered_set pair queue stack deque priority_queue list List Map Set HashMap HashSet TreeMap ArrayList LinkedList Deque ArrayDeque PriorityQueue Integer Long Character Boolean Optional dict tuple str object Vec Option Box Rc RefCell ListNode TreeNode Node number any unknown".split(
    " ",
  ),
);

const isPython = (lang: string | null) => /^py/i.test(lang ?? "");

export type HlState = { block: false | "c" | '"""' | "'''" };

function tokenizeLine(line: string, py: boolean, state: HlState): Token[] {
  const out: Token[] = [];
  const push = (text: string, kind: TokenKind) => {
    if (!text) return;
    const last = out.at(-1);
    if (last && last.kind === kind) last.text += text;
    else out.push({ text, kind });
  };
  let i = 0;
  while (i < line.length) {
    if (state.block) {
      const end = state.block === "c" ? "*/" : state.block;
      const j = line.indexOf(end, i);
      if (j < 0) {
        push(line.slice(i), state.block === "c" ? "com" : "str");
        return out;
      }
      push(line.slice(i, j + end.length), state.block === "c" ? "com" : "str");
      i = j + end.length;
      state.block = false;
      continue;
    }
    const rest = line.slice(i);
    const ch = line[i]!;
    if (py ? ch === "#" : rest.startsWith("//")) {
      push(rest, "com");
      return out;
    }
    if (!py && rest.startsWith("/*")) {
      state.block = "c";
      push("/*", "com");
      i += 2;
      continue;
    }
    if (py && (rest.startsWith('"""') || rest.startsWith("'''"))) {
      state.block = rest.slice(0, 3) as '"""' | "'''";
      push(rest.slice(0, 3), "str");
      i += 3;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      let j = i + 1;
      while (j < line.length && line[j] !== ch) j += line[j] === "\\" ? 2 : 1;
      push(line.slice(i, j + 1), "str");
      i = j + 1;
      continue;
    }
    const num = /^(0x[\da-f]+|\d[\d_]*(\.\d+)?(e[+-]?\d+)?)[a-z]*/i.exec(rest);
    if (num) {
      push(num[0], "num");
      i += num[0].length;
      continue;
    }
    const word = /^[A-Za-z_$][\w$]*/.exec(rest);
    if (word) {
      const w = word[0];
      const after = line.slice(i + w.length).trimStart();
      const kind: TokenKind = (py ? PY_KW : C_KW).has(w)
        ? "kw"
        : TYPES.has(w)
          ? "type"
          : after.startsWith("(")
            ? "fn"
            : /^[A-Z][a-z]/.test(w)
              ? "type"
              : "plain";
      push(w, kind);
      i += w.length;
      continue;
    }
    if (/\s/.test(ch)) {
      const ws = /^\s+/.exec(rest)![0];
      push(ws, "plain");
      i += ws.length;
      continue;
    }
    push(ch, /[=<>!+\-*/%&|^~?:]/.test(ch) ? "op" : "plain");
    i++;
  }
  return out;
}

/** Every line of `code` as tokens. */
export function highlight(code: string, lang: string | null): Token[][] {
  const py = isPython(lang);
  const state: HlState = { block: false };
  return code.split("\n").map((l) => tokenizeLine(l, py, state));
}

/**
 * Where two versions of a line differ: the shared start and end are kept, the middle is
 * the change. Used to mark exactly which characters a drill broke.
 */
export function diffRange(a: string, b: string): { start: number; endA: number; endB: number } {
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA--;
    endB--;
  }
  return { start, endA, endB };
}
