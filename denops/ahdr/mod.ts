import * as path from "https://deno.land/std@0.89.0/path/mod.ts";
import { parse } from "https://deno.land/std@0.89.0/encoding/toml.ts";
import { start } from "https://deno.land/x/denops_std@v0.3/mod.ts";
import { isWindows } from "https://deno.land/std@0.89.0/_util/os.ts";

start(async (vim) => {
  const pathname = new URL(".", import.meta.url).pathname;
  const dir = isWindows ? pathname.slice(1) : pathname;
  const toml = path.join(dir, "config.toml");
  const cfg = parse(await Deno.readTextFile(toml));

  vim.register({
    async adhr(name: unknown): Promise<unknown> {
      if (typeof name !== "string") {
        throw new Error(
          `'name' attribute of 'echo' in ${vim.name} must be string`
        );
      }
      // Get filetype.
      const ft = (await vim.eval("&filetype")) as string;

      const h = (cfg as Record<string, Record<string, string>[]>)[ft].filter(
        (x) => x.name === name
      )[0];

      if (!h) {
        console.error(`ft: ${ft}, name: ${name} is not found !!!`);
        return await Promise.resolve();
      }

      console.log(
        `ft: ${ft}, name: ${h.name}, prefix: ${h.prefix}, suffix: ${h.suffix}, ext: ${h.ext}`
      );
      console.log(`header: ${h.header}`);

      // Get buffer info.
      const inpath = (await vim.call("expand", "%:p")) as string;
      const fenc = (await vim.eval("&fenc")) as string;
      const ff = (await vim.eval("&ff")) as string;
      const lz = (await vim.eval("&lazyredraw")) as string;
      const bname = (await vim.call("bufname")) as string;

      const lines = (await vim.call("getline", 1, "$")) as string[];
      const outbuf = `${h.header}\n${lines.join("\n")}`;

      // Get output path.
      const outpath = path.join(
        path.dirname(inpath),
        `${h.prefix}${path.basename(inpath, path.extname(inpath))}${h.suffix}${
          h.ext
        }`
      );

      console.log(`inpath: ${inpath}`);
      console.log(`outpath: ${outpath}`);

      console.log(`Set fenc: ${fenc}, ff: ${ff} to ${outpath}`);

      await vim.cmd(`set lazyredraw`);
      await vim.cmd(`edit ${outpath}`);
      await vim.call("setline", 1, outbuf.split(/\r?\n/g));
      // Fix fenc and ff.
      await vim.execute(`
        setlocal fenc=${fenc}
        setlocal ff=${ff}
        write
        bwipeout
        buffer ${bname}
      `);
      if (!lz) {
        await vim.cmd(`set nolazyredraw`);
      }

      return await Promise.resolve(`Write [${outpath}]`);
    },
  });

  await vim.execute(`
    command! -nargs=1 DenopsAhdr call denops#notify('${vim.name}', 'adhr', [<q-args>])
  `);

  console.log("dps-ahdr has loaded");
});
