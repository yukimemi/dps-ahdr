// =============================================================================
// File        : main_test.ts
// Author      : yukimemi
// Last Change : 2025/04/27 07:53:53.
// =============================================================================

import { DenopsStub } from "jsr:@denops/test@3.0.4";
import { main } from "./main.ts";

const createDenops = () => (
  new DenopsStub({
    call: (fn, ...args) => {
      return Promise.resolve([fn, ...args]);
    },
  })
);

Deno.test({
  name: "Test load main",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    try {
      const denops = createDenops();
      await main(denops);
    } catch (e) {
      console.error(e);
    }
  },
});
