import * as _ from "https://cdn.skypack.dev/lodash@4.17.21";
import * as fn from "https://deno.land/x/denops_std@v5.3.0/function/mod.ts";
import * as fs from "https://deno.land/std@0.213.0/fs/mod.ts";
import * as helper from "https://deno.land/x/denops_std@v5.3.0/helper/mod.ts";
import * as op from "https://deno.land/x/denops_std@v5.3.0/option/mod.ts";
import * as path from "https://deno.land/std@0.213.0/path/mod.ts";
import * as toml from "https://deno.land/std@0.213.0/toml/mod.ts";
import * as vars from "https://deno.land/x/denops_std@v5.3.0/variable/mod.ts";
import type { Denops } from "https://deno.land/x/denops_std@v5.3.0/mod.ts";
import { assert, is } from "https://deno.land/x/unknownutil@v3.14.1/mod.ts";

function existsSync(filePath: string): boolean {
  try {
    Deno.lstatSync(filePath);
    return true;
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) {
      return false;
    }
    throw err;
  }
}

export async function main(denops: Denops): Promise<void> {
  // debug.
  const debug = await vars.g.get(denops, "ahdr_debug", false);
  // deno-lint-ignore no-explicit-any
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
  if (existsSync(userToml)) {
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
      try {
        assert(name, is.String);
        // Get filetype and fileformat.
        const ft = await op.filetype.get(denops);
        const ff = await op.fileformat.get(denops);

        const h = (cfg as Record<string, Record<string, string>[]>)[ft]?.filter(
          (x) => x.name === name,
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
        const inpath = (await fn.expand(denops, "%:p")) as string;
        const lines = await fn.getline(denops, 1, "$");
        let outbuf = `${h.header}\n${lines.join("\n")}`;

        if (ff === "dos") {
          outbuf = outbuf.split("\n").join("\r\n");
        }

        // Get output path.
        const dst = h.dst ?? "";
        const outpath = path.join(
          path.isAbsolute(dst) ? dst : path.join(path.dirname(inpath), dst),
          `${h.prefix}${path.basename(inpath, path.extname(inpath))}${h.suffix}${h.ext}`,
        );

        clog(`inpath: ${inpath}`);
        clog(`outpath: ${outpath}`);

        await fs.ensureDir(path.dirname(outpath));

        if (existsSync(outpath)) {
          clog(`Remove ${outpath}`);
          await Deno.remove(outpath);
        }

        await Deno.writeTextFile(outpath, outbuf);

        console.log(`Write [${outpath}]`);
      } catch (e) {
        clog(e);
      }
    },
  };

  await helper.execute(
    denops,
    `
    command! -nargs=1 DenopsAhdr call denops#notify('${denops.name}', 'ahdr', [<q-args>])
  `,
  );

  clog("dps-ahdr has loaded");
}
