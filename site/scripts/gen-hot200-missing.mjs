/**
 * 补齐 Hot200.md 中「有题面但无代码」的 5 道题（312/131/51/994/208）。
 * 题面、示例、思路解析仍从原文抽取；代码由本仓库按标准解法补写。
 *
 * 用法：node scripts/gen-hot200-missing.mjs
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const MD = path.join(ROOT, "..", "_review", "Hot200.md");
const OUT = path.join(ROOT, "src", "data", "hot200");

const CODES = {
  312: `class Solution {
    public int maxCoins(int[] nums) {
        int n = nums.length;
        int[] a = new int[n + 2];
        a[0] = 1;
        a[n + 1] = 1;
        for (int i = 0; i < n; i++) a[i + 1] = nums[i];
        int[][] dp = new int[n + 2][n + 2];
        for (int len = 2; len <= n + 1; len++) {
            for (int i = 0; i + len <= n + 1; i++) {
                int j = i + len;
                for (int k = i + 1; k < j; k++) {
                    int gain = a[i] * a[k] * a[j] + dp[i][k] + dp[k][j];
                    dp[i][j] = Math.max(dp[i][j], gain);
                }
            }
        }
        return dp[0][n + 1];
    }
}`,
  131: `class Solution {
    List<List<String>> res = new ArrayList<>();
    List<String> path = new ArrayList<>();

    public List<List<String>> partition(String s) {
        int n = s.length();
        boolean[][] pal = new boolean[n][n];
        for (int len = 1; len <= n; len++) {
            for (int i = 0; i + len - 1 < n; i++) {
                int j = i + len - 1;
                pal[i][j] = s.charAt(i) == s.charAt(j) && (len <= 2 || pal[i + 1][j - 1]);
            }
        }
        dfs(s, 0, pal);
        return res;
    }

    void dfs(String s, int start, boolean[][] pal) {
        if (start == s.length()) {
            res.add(new ArrayList<>(path));
            return;
        }
        for (int end = start; end < s.length(); end++) {
            if (!pal[start][end]) continue;
            path.add(s.substring(start, end + 1));
            dfs(s, end + 1, pal);
            path.remove(path.size() - 1);
        }
    }
}`,
  51: `class Solution {
    List<List<String>> res = new ArrayList<>();
    Set<Integer> cols = new HashSet<>();
    Set<Integer> diag1 = new HashSet<>();
    Set<Integer> diag2 = new HashSet<>();
    int[] queens;

    public List<List<String>> solveNQueens(int n) {
        queens = new int[n];
        backtrack(0, n);
        return res;
    }

    void backtrack(int row, int n) {
        if (row == n) {
            res.add(build(n));
            return;
        }
        for (int col = 0; col < n; col++) {
            if (cols.contains(col) || diag1.contains(row - col) || diag2.contains(row + col)) continue;
            queens[row] = col;
            cols.add(col);
            diag1.add(row - col);
            diag2.add(row + col);
            backtrack(row + 1, n);
            cols.remove(col);
            diag1.remove(row - col);
            diag2.remove(row + col);
        }
    }

    List<String> build(int n) {
        List<String> board = new ArrayList<>();
        for (int r = 0; r < n; r++) {
            StringBuilder sb = new StringBuilder();
            for (int c = 0; c < n; c++) sb.append(queens[r] == c ? 'Q' : '.');
            board.add(sb.toString());
        }
        return board;
    }
}`,
  994: `class Solution {
    public int orangesRotting(int[][] grid) {
        int m = grid.length, n = grid[0].length;
        Queue<int[]> q = new LinkedList<>();
        int fresh = 0;
        for (int i = 0; i < m; i++) {
            for (int j = 0; j < n; j++) {
                if (grid[i][j] == 2) q.offer(new int[]{i, j});
                else if (grid[i][j] == 1) fresh++;
            }
        }
        if (fresh == 0) return 0;
        int[][] dirs = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
        int minutes = 0;
        while (!q.isEmpty()) {
            int size = q.size();
            boolean rotten = false;
            for (int k = 0; k < size; k++) {
                int[] cur = q.poll();
                for (int[] d : dirs) {
                    int x = cur[0] + d[0], y = cur[1] + d[1];
                    if (x < 0 || x >= m || y < 0 || y >= n || grid[x][y] != 1) continue;
                    grid[x][y] = 2;
                    fresh--;
                    rotten = true;
                    q.offer(new int[]{x, y});
                }
            }
            if (rotten) minutes++;
        }
        return fresh == 0 ? minutes : -1;
    }
}`,
  208: `class Trie {
    private Trie[] children;
    private boolean end;

    public Trie() {
        children = new Trie[26];
        end = false;
    }

    public void insert(String word) {
        Trie node = this;
        for (char c : word.toCharArray()) {
            int idx = c - 'a';
            if (node.children[idx] == null) node.children[idx] = new Trie();
            node = node.children[idx];
        }
        node.end = true;
    }

    public boolean search(String word) {
        Trie node = find(word);
        return node != null && node.end;
    }

    public boolean startsWith(String prefix) {
        return find(prefix) != null;
    }

    private Trie find(String s) {
        Trie node = this;
        for (char c : s.toCharArray()) {
            int idx = c - 'a';
            if (node.children[idx] == null) return null;
            node = node.children[idx];
        }
        return node;
    }
}`
};

const lines = fs.readFileSync(MD, "utf8").split(/\r?\n/);
const heads = [];
let cat = "未分类";
lines.forEach((l, i) => {
  const m = l.match(/^#{1,4}\s+(.*)$/);
  if (!m) return;
  const raw = m[1].trim();
  const lc = raw.match(/^LeetCode(\d+)\b/i);
  if (lc) heads.push({ line: i, lc: Number(lc[1]), raw, category: cat });
  else cat = raw.replace(/\\/g, "").trim();
});

const DIFF = { 动态规划: "medium", 回溯: "medium", 图: "medium", 字符串: "medium", 设计: "medium" };

const parse = (h, end) => {
  const body = lines.slice(h.line + 1, end);
  const statement = [];
  let cur = null;
  for (const raw of body) {
    if (/^>\s?/.test(raw)) {
      const s = raw.replace(/^>\s?/, "").replace(/\\([.\-+*_`[\]()#!~>|&<>])/g, "$1").trim();
      if (!s) continue;
      if (!cur) cur = [];
      cur.push(s);
    } else if (cur) { statement.push(cur.join(" ")); cur = null; }
  }
  if (cur) statement.push(cur.join(" "));

  const examples = [];
  let ex = null;
  for (const raw of body) {
    const s = raw.replace(/\\([.\-+*_`[\]()#!~>|&<>])/g, "$1").replace(/\*\*/g, "").trim();
    if (/^示例/.test(s)) { if (ex) examples.push(ex); ex = { label: s, in: "", out: "", explain: [] }; continue; }
    if (!ex) continue;
    if (/^输入/.test(s)) ex.in = s.replace(/^输入[:：]\s*/, "").trim();
    else if (/^输出/.test(s)) ex.out = s.replace(/^输出[:：]\s*/, "").trim();
    else if (/^解释/.test(s)) ex.explain.push(s.replace(/^解释[:：]\s*/, "").trim());
  }
  if (ex) examples.push(ex);

  let idea = null;
  for (const raw of body) {
    const s = raw.replace(/\\([.\-+*_`[\]()#!~>|&<>])/g, "$1").match(/^\*\*思路(?:解析|分析)[:：]?\**\s*(.*)$/);
    if (s && s[1].trim()) { idea = s[1].replace(/\*\*/g, "").trim(); break; }
  }
  const title = h.raw.replace(/^LeetCode\d+\\?\.\s*/, "").replace(/【.+?】/g, "").replace(/\\/g, "").trim();
  const tags = (h.raw.match(/【(.+?)】/)?.[1] ?? "").split(/[、,，/]/).map((x) => x.trim()).filter(Boolean);
  return { title, tags, statement, examples, idea };
};

const targets = new Set([312, 131, 51, 994, 208]);
const created = [];
for (let k = 0; k < heads.length; k++) {
  const h = heads[k];
  if (!targets.has(h.lc)) continue;
  const end = k + 1 < heads.length ? heads[k + 1].line : lines.length;
  const p = parse(h, end);
  const slug = `lc${h.lc}`;
  if (fs.existsSync(path.join(OUT, `${slug}.json`))) continue;
  const code = CODES[h.lc];
  if (!code) continue;
  const doc = {
    slug, lc: h.lc, title: p.title, approach: null, category: h.category, tags: p.tags,
    difficulty: DIFF[h.category] ?? null, sourceLine: h.line + 1,
    statement: p.statement.length ? p.statement : [p.title],
    examples: p.examples, figures: [], sourceIdea: p.idea,
    notes: ["原文只有题面与示例、没有代码；本题代码由本仓库补写（标准解法）。"],
    code: { lang: "java", source: code, lines: code.split("\n").length },
    explain: {
      oneLiner: p.idea || "标准解法见代码：按区间 DP / 回溯 / 多源 BFS / 字典树组织，逐层剪枝。",
      analogy: "", walkthrough: [], codeWalkthrough: [], pitfalls: [],
      complexity: { time: "", space: "", why: "" }, variants: []
    },
    drill: { fingerprint: [], blanks: [], keyTokens: [], accepted: [] },
    status: "written"
  };
  fs.writeFileSync(path.join(OUT, `${slug}.json`), JSON.stringify(doc, null, 2) + "\n", "utf8");
  created.push({ slug, title: p.title, category: h.category });
}

const idxPath = path.join(OUT, "index.json");
const idx = JSON.parse(fs.readFileSync(idxPath, "utf8"));
for (const c of created) {
  if (!idx.items.some((x) => x.slug === c.slug)) {
    idx.items.push({ slug: c.slug, lc: Number(c.slug.slice(2)), title: c.title, category: c.category, tags: [], difficulty: DIFF[c.category] ?? null, lines: 0, status: "written" });
  }
}
idx.generatedAt = new Date().toISOString();
fs.writeFileSync(idxPath, JSON.stringify(idx, null, 2) + "\n", "utf8");
console.log("补齐", created.length, "题：", created.map((c) => c.slug).join(", "));
