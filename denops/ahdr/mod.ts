import * as path from "https://deno.land/std@0.89.0/path/mod.ts";
import { exists } from "https://deno.land/std@0.89.0/fs/mod.ts";
import { isWindows } from "https://deno.land/std@0.89.0/_util/os.ts";
import { parse } from "https://deno.land/std@0.89.0/encoding/toml.ts";
import { start } from "https://deno.land/x/denops_std@v0.4/mod.ts";
import { ensureDir } from "https://deno.land/std@0.90.0/fs/mod.ts";

start(async (vim) => {
  // debug.
  const debug = await vim.g.get("ahdr_debug", false);
  const clog = (...data: any[]): void => {
    if (debug) {
      console.log(...data);
    }
  };
  const pathname = new URL(".", import.meta.url).pathname;
  const dir = isWindows ? pathname.slice(1) : pathname;
  const toml = path.join(dir, "config.toml");
  let cfg = parse(await Deno.readTextFile(toml));

  // User config.
  const userToml = (await vim.call(
    "expand",
    (await vim.g.get("ahdr_cfg_path", "~/.ahdr.toml")) as string
  )) as string;
  clog(`g:ahdr_cfg_path = ${userToml}`);
  if (await exists(userToml)) {
    clog(`Merge user config: ${userToml}`);
    cfg = { ...cfg, ...parse(await Deno.readTextFile(userToml)) };
  }

  clog(cfg);

  vim.register({
    async ahdr(name: unknown): Promise<unknown> {
      if (typeof name !== "string") {
        throw new Error(
          `'name' attribute of 'ahdr' in ${vim.name} must be string`
        );
      }
      // Get filetype.
      const ft = (await vim.eval("&filetype")) as string;

      const h = (cfg as Record<string, Record<string, string>[]>)[ft]?.filter(
        (x) => x.name === name
      )[0];

      if (!h) {
        console.error(`ft: ${ft}, name: ${name} is not found !!!`);
        return await Promise.resolve();
      }

      clog(
        `ft: ${ft}, name: ${h.name}, prefix: ${h.prefix}, suffix: ${h.suffix}, ext: ${h.ext}`
      );
      clog(`header: ${h.header}`);

      // Get buffer info.
      const inpath = (await vim.call("expand", "%:p")) as string;
      const fenc = (await vim.eval("&fenc")) as string;
      const ff = (await vim.eval("&ff")) as string;
      const lz = (await vim.eval("&lazyredraw")) as string;
      const bname = (await vim.call("bufname")) as string;

      const lines = (await vim.call("getline", 1, "$")) as string[];
      const outbuf = `${h.header}\n${lines.join("\n")}`;

      // Get output path.
      const dst = h.dst ?? "";
      const outpath = path.join(
        path.isAbsolute(dst) ? dst : path.join(path.dirname(inpath), dst),
        `${h.prefix}${path.basename(inpath, path.extname(inpath))}${h.suffix}${
          h.ext
        }`
      );

      clog(`inpath: ${inpath}`);
      clog(`outpath: ${outpath}`);

      await ensureDir(path.dirname(outpath));

      clog(`Set fenc: ${fenc}, ff: ${ff} to ${outpath}`);

      if (await exists(outpath)) {
        clog(`Remove ${outpath}`);
        await Deno.remove(outpath);
      }

      await vim.execute(`
        silent! set lazyredraw
        silent! edit ${outpath}
      `);
      await vim.call("setline", 1, outbuf.split(/\r?\n/g));
      // Fix fenc and ff.
      await vim.execute(`
        silent! setlocal fenc=${fenc}
        silent! setlocal ff=${ff}
        silent! write
        silent! bwipeout
        silent! buffer ${bname}
      `);
      if (!lz) {
        await vim.cmd(`silent! set nolazyredraw`);
      }

      console.log(`Write [${outpath}]`);
      return await Promise.resolve();
    },
  });

  await vim.execute(`
    command! -nargs=1 DenopsAhdr call denops#notify('${vim.name}', 'ahdr', [<q-args>])
  `);

  clog("dps-ahdr has loaded");
});
