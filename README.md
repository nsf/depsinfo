# Analyze dependencies and libraries of a deno script

A tool that let's you analyze the dependencies and libraries of a deno script. It simply creates an alternative view of the `deno info --json` output.

As an example, let's run the tool on a tool itself, here's the output:

```
file:///home/nsf/projects/depsinfo/depsinfo.ts

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
            ↳ file:///home/nsf/projects/depsinfo/deps/cliffy_command.ts
              ↳ file:///home/nsf/projects/depsinfo/depsinfo.ts
    https://deno.land/x/cliffy@v0.25.6, first included from:
      ↳ file:///home/nsf/projects/depsinfo/deps/cliffy_command.ts
        ↳ file:///home/nsf/projects/depsinfo/depsinfo.ts
```

Under "Dependencies" section it shows the summary of direct depenencies of a script. Colums are:

 - **Contributed** - How much space the script contributed, this takes into account reused modules.
 - **Isolated** - How much space the script would contribute if it was the only dependency. This also takes into account reused modules, but only of a given dependency.
 - **Shared** - How much space was saved due to previously included modules (**shared** = **isolated** - **contributed**)
 - **Specifier** - The `import {} from "specifier"` part.

Under "Unique libraries used" section the tool shows base url of dependencies with "@" symbol in the path. It's useful to spot different versions of the same library. Each entry also shows where the library was first included from.