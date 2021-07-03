import {
  _,
  Denops,
  ensureString,
  execute,
  fs,
  path,
  toml,
  vars,
} from "./deps.ts";

export async function main(denops: Denops): Promise<void> {
  // debug.
  const debug = await vars.g.get(denops, "ahdr_debug", false);
  const clog = (...data: any[]): void => {
    if (debug) {
      console.log(...data);
    }
  };
  const pathname = new URL(".", import.meta.url);
  const dir = path.fromFileUrl(pathname);
  const config = path.join(dir, "config.toml");
  let cfg = toml.parse(await Deno.readTextFile(config));

  // User config.
  const userToml = (await denops.call(
    "expand",
    (await vars.g.get(denops, "ahdr_cfg_path", "~/.ahdr.toml")) as string,
  )) as string;
  clog(`g:ahdr_cfg_path = ${userToml}`);
  if (await fs.exists(userToml)) {
    clog(`Merge user config: ${userToml}`);
    cfg = _.mergeWith(
      cfg,
      toml.parse(await Deno.readTextFile(userToml)),
      (a: Record<string, string>[], b: Record<string, string>[]) => a.concat(b),
    );
  }

  clog(cfg);

  denops.dispatcher = {
    async ahdr(name: unknown): Promise<void> {
      ensureString(name);
      // Get filetype and fileformat.
      const ft = (await denops.eval("&filetype")) as string;
      const ff = (await denops.eval("&fileformat")) as string;

      const h =
        (cfg as Record<string, Record<string, string>[]>)[ft]?.filter((x) =>
          x.name === name
        )[0];

      if (!h) {
        console.error(`ft: ${ft}, name: ${name} is not found !!!`);
        return;
      }

      clog(
        `ft: ${ft}, name: ${h.name}, prefix: ${h.prefix}, suffix: ${h.suffix}, ext: ${h.ext}`,
      );
      clog(`header: ${h.header}`);

      // Get buffer info.
      const inpath = (await denops.call("expand", "%:p")) as string;
      const lines = (await denops.call("getline", 1, "$")) as string[];
      let outbuf = `${h.header}\n${lines.join("\n")}`;

      if (ff === "dos") {
        outbuf = outbuf
          .split("\n")
          .join("\r\n");
      }

      // Get output path.
      const dst = h.dst ?? "";
      const outpath = path.join(
        path.isAbsolute(dst) ? dst : path.join(path.dirname(inpath), dst),
        `${h.prefix}${
          path.basename(inpath, path.extname(inpath))
        }${h.suffix}${h.ext}`,
      );

      clog(`inpath: ${inpath}`);
      clog(`outpath: ${outpath}`);

      await fs.ensureDir(path.dirname(outpath));

      if (await fs.exists(outpath)) {
        clog(`Remove ${outpath}`);
        await Deno.remove(outpath);
      }

      await Deno.writeTextFile(outpath, outbuf);

      console.log(`Write [${outpath}]`);
    },
  };

  await execute(
    denops,
    `
    command! -nargs=1 DenopsAhdr call denops#notify('${denops.name}', 'ahdr', [<q-args>])
  `,
  );

  clog("dps-ahdr has loaded");
}
