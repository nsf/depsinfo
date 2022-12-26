# Analyze dependencies and libraries of a deno script

A tool that let's you analyze the dependencies and libraries of a deno script. It simply prints an alternative view of the data provided by `deno info --json`.

As an example, let's run the tool on the tool itself:

```sh
deno run https://deno.land/x/depsinfo@1.0.0/depsinfo.ts https://deno.land/x/depsinfo@1.0.0/depsinfo.ts
```

Here's the output:

```
https://deno.land/x/depsinfo@1.0.0/depsinfo.ts

  Dependencies:
    contributed  isolated  shared   specifier
    265 kB       265 kB    0 B      ./deps/cliffy_command.ts
    146 B        45.3 kB   45.2 kB  ./deps/cliffy_table.ts
    19.9 kB      32.4 kB   12.4 kB  ./deps/cliffy_ansi.ts
    5.78 kB      5.78 kB   0 B      ./deps/std_fmt_bytes.ts
    48.9 kB      48.9 kB   0 B      ./deps/std_streams_read_all.ts
    339 kB       397 kB    57.6 kB  TOTAL

  Unique libraries used:
    https://deno.land/std@0.170.0, first included from:
      ↳ https://deno.land/x/cliffy@v0.25.6/command/deps.ts
        ↳ https://deno.land/x/cliffy@v0.25.6/command/command.ts
          ↳ https://deno.land/x/cliffy@v0.25.6/command/mod.ts
            ↳ https://deno.land/x/depsinfo@1.0.0/deps/cliffy_command.ts
              ↳ https://deno.land/x/depsinfo@1.0.0/depsinfo.ts
    https://deno.land/x/cliffy@v0.25.6, first included from:
      ↳ https://deno.land/x/depsinfo@1.0.0/deps/cliffy_command.ts
        ↳ https://deno.land/x/depsinfo@1.0.0/depsinfo.ts
```

Under "Dependencies" section it shows the summary of direct depenencies of a script. Colums are:

 - **Contributed** - How much space the dependency contributed, this takes into account reused modules.
 - **Isolated** - How much space the dependency would contribute if it was the only dependency. This also takes into account reused modules, but only of a given dependency.
 - **Shared** - How much space was saved due to previously included modules (**shared** = **isolated** - **contributed**)
 - **Specifier** - The specifier from the import clause (`import {} from "<specifier>"`).

Under "Unique libraries used" section the tool shows base url of dependencies with "@" symbol in the path. It's useful to spot different versions of the same library. Each entry also shows where the library was first included from.

## Required permissions

The tool runs `deno info --json <file-or-url>` for you, thus it requires `--allow-run=deno`. If you feel super paranoid about it. You can feed the output of `deno info --json` to the script yourself by specifying `-` as input. E.g.:
```sh
deno info --json https://deno.land/x/depsinfo@1.0.0/depsinfo.ts | deno run https://deno.land/x/depsinfo@1.0.0/depsinfo.ts -
```

## Installation

Deno provides a helper to install a script as an executable: https://deno.land/manual@v1.29.1/tools/script_installer.

You can of course install depsinfo that way, just run:

```sh
deno install --allow-run=deno https://deno.land/x/depsinfo@1.0.0/depsinfo.ts
```