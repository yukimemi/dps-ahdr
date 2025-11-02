# ahdr.vim

Denops Add Header

# Features

This plugin adds a header for some files.

# Installation

If you use [folke/lazy.nvim](https://github.com/folke/lazy.nvim).

```lua
{
  "yukimemi/ahdr.vim",
  lazy = false,
  dependencies = {
    "vim-denops/denops.vim",
  },
}
```

If you use [yukimemi/dvpm](https://github.com/yukimemi/dvpm).

```typescript
dvpm.add({ url: "yukimemi/ahdr.vim" });
```

# Requirements

- [Deno - A modern runtime for JavaScript and TypeScript](https://deno.land/)
- [vim-denops/denops.vim: 🐜 An ecosystem of Vim/Neovim which allows developers to write cross-platform plugins in Deno](https://github.com/vim-denops/denops.vim)
# Usage

No special settings are required.
Default config file is [cofnig.toml](https://github.com/yukimemi/ahdr.vim/blob/main/denops/ahdr/config.toml)

# Commands

`:DenopsAhdr`
Add headers depending on file type.

# Config

No settings are required. However, the following settings can be made if necessary.

`g:ahdr_debug`
Enable debug messages.
default is v:false

`g:ahdr_cfg_path`
Path to config toml file path.
default is `~/.ahdr.toml`

# Example

```vim
let g:ahdr_debug = v:false
let g:ahdr_cfg_path = expand("~/.config/ahdr/config.toml")
```

# License

Licensed under MIT License.

Copyright (c) 2023 yukimemi
