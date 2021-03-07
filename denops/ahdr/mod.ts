import * as path from "https://deno.land/std@0.89.0/path/mod.ts";
import { parse } from "https://deno.land/std@0.89.0/encoding/toml.ts";
import { start } from "https://deno.land/x/denops_std@v0.3/mod.ts";

start(async (vim) => {
  // Config load.
  // this file's path.
  const dir = new URL(".", import.meta.url).pathname;
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

      // Get buffer file path.
      const infile = (await vim.call("expand", "%:p")) as string;
      const buf = await Deno.readTextFile(infile);

      // Merge out.
      const outfile = path.join(
        path.dirname(infile),
        `${h.prefix}${path.basename(infile, path.extname(infile))}${h.suffix}${
          h.ext
        }`
      );

      console.log(`infile: ${infile}`);
      console.log(`outfile: ${outfile}`);

      await Deno.writeTextFile(outfile, `${h.header}\n`, { create: true });

      const fenc = (await vim.eval("&fenc")) as string;
      const ff = (await vim.eval("&ff")) as string;
      const bname = (await vim.call("bufname")) as string;

      // Fix fenc and ff.
      await vim.execute(`
        edit ${outfile}
        setlocal fenc=${fenc}
        setlocal ff=${ff}
        update
        bwipeout
        buffer ${bname}
      `);

      await Deno.writeTextFile(outfile, buf, { append: true });

      return await Promise.resolve(`Write [${outfile}]`);
    },
  });

  await vim.execute(`
    command! -nargs=1 DenopsAhdr call denops#notify('${vim.name}', 'adhr', [<q-args>])
  `);

  console.log("dps-ahdr has loaded");
});
