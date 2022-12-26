import { Command } from "./deps/cliffy_command.ts";
import { Table } from "./deps/cliffy_table.ts";
import { colors } from "./deps/cliffy_ansi.ts";
import { format as fmtb } from "./deps/std_fmt_bytes.ts";
import { readAll } from "./deps/std_streams_read_all.ts";

const description = `
Analyze dependencies and libraries of a deno script. You can also use "-"
as input, in this case the tool will read stdin and it must contain the
output of "deno info --json <file-or-url>" command.
`.trim();

const { args } = await new Command()
  .name("depsinfo")
  .version("1.0.3")
  .description(description)
  .arguments("<file-or-url>")
  .parse();

interface LC {
  line: number;
  character: number;
}

interface DenoInfo {
  modules: {
    dependencies?: {
      specifier: string;
      code?: { specifier: string; span: { start: LC; end: LC } };
    }[];
    size: number;
    specifier: string;
  }[];
  roots: string[];
  redirects?: Record<string, string>;
}

type DenoModule = DenoInfo["modules"][0];

function getSizeRecursive(
  visited: Set<string>,
  modMap: Map<string, DenoModule>,
  specifier: string,
): number {
  if (visited.has(specifier)) {
    return 0;
  }
  visited.add(specifier);
  let size = 0;
  const m = modMap.get(specifier);
  if (m) {
    size += m.size;
    if (m.dependencies) {
      for (const d of m.dependencies) {
        if (d.code) {
          size += getSizeRecursive(visited, modMap, d.code.specifier);
        }
      }
    }
  }
  return size;
}

function indent(level: number): string {
  let out = "";
  for (let i = 0; i < level; i++) {
    out += "  ";
  }
  return out;
}

function extractLib(specifier: string): string | undefined {
  const m = /([^@]+@[^/]+).+/.exec(specifier);
  return m ? m[1] : undefined;
}

function prettyPrintLib(s: string) {
  const [lib, ver] = s.split("@");
  return `${lib}@${colors.yellow(ver)}`;
}

function collectUniqueSpecifiers(
  out: Map<string, string[]>,
  modMap: Map<string, DenoModule>,
  specifier: string,
  chain: string[],
  visited = new Set<string>(),
) {
  if (visited.has(specifier)) return;
  visited.add(specifier);

  const m = modMap.get(specifier);
  if (m) {
    if (!m.dependencies) return;
    for (const d of m.dependencies) {
      if (!d.code) continue;
      const lib = extractLib(d.code.specifier);
      if (lib) {
        if (!out.has(lib)) {
          out.set(lib, chain);
        }
      }
      collectUniqueSpecifiers(out, modMap, d.code.specifier, [
        ...chain,
        d.code.specifier,
      ], visited);
    }
  }
}

function followRedirects(
  redirects: Record<string, string> | undefined,
  rname: string,
): string {
  if (!redirects) return rname;
  while (redirects[rname]) {
    rname = redirects[rname];
  }
  return rname;
}

let data: DenoInfo = { modules: [], roots: [] };
if (args[0] === "-") {
  data = JSON.parse(
    new TextDecoder().decode(await readAll(Deno.stdin)),
  ) as DenoInfo;
} else {
  const p = Deno.run({
    stdout: "piped",
    cmd: [
      "deno",
      "info",
      "--json",
      args[0],
    ],
  });
  try {
    data = JSON.parse(new TextDecoder().decode(await p.output())) as DenoInfo;
  } finally {
    p.close();
  }
}

const modMap = new Map<string, DenoModule>();
for (const m of data.modules) {
  if (m.dependencies) {
    m.dependencies.sort((a, b) => {
      const sa = a.code?.span.start;
      const sb = b.code?.span.start;
      const la = sa?.line ?? Infinity;
      const lb = sb?.line ?? Infinity;
      const ca = sa?.character ?? Infinity;
      const cb = sb?.character ?? Infinity;
      return (la === lb) ? ca - cb : la - lb;
    });
  }
  modMap.set(m.specifier, m);
}
for (let rname of data.roots) {
  rname = followRedirects(data.redirects, rname);
  const selflib = extractLib(rname);
  const r = modMap.get(rname);
  if (!r) continue;
  const visited = new Set<string>();
  console.log(colors.underline.bold(`${r.specifier}`));
  if (r.dependencies) {
    console.log(colors.bold("\n  Dependencies:"));
    const total = {
      contributed: 0,
      isolated: 0,
      shared: 0,
    };
    const body = r.dependencies.map((d) => {
      const contributed = d.code
        ? getSizeRecursive(visited, modMap, d.code.specifier)
        : 0;
      const isolated = d.code
        ? getSizeRecursive(new Set(), modMap, d.code.specifier)
        : 0;
      const shared = isolated - contributed;
      total.contributed += contributed;
      total.isolated += isolated;
      total.shared += shared;
      return [fmtb(contributed), fmtb(isolated), fmtb(shared), d.specifier];
    });
    const b = colors.bold;
    new Table()
      .header([b("contributed"), b("isolated"), b("shared"), b("specifier")])
      .padding(2)
      .body(
        [
          ...body,
          [
            fmtb(total.contributed),
            fmtb(total.isolated),
            fmtb(total.shared),
            "TOTAL",
          ],
        ],
      )
      .indent(4)
      .render();
  }
  console.log(colors.bold("\n  Unique libraries used:"));
  const uniqueLibs = new Map<string, string[]>();
  collectUniqueSpecifiers(uniqueLibs, modMap, rname, [rname]);
  for (const key of Array.from(uniqueLibs.keys()).sort()) {
    if (key === selflib) continue;
    const val = uniqueLibs.get(key)!;
    console.log(`    ${prettyPrintLib(key)}, first included from:`);
    for (let i = val.length - 1; i >= 0; i--) {
      console.log(
        colors.gray(
          `      ${indent(val.length - 1 - i)}↳ ${val[i]}`,
        ),
      );
    }
  }
}
