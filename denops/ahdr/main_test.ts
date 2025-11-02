// =============================================================================
// File        : main_test.ts
// Author      : yukimemi
// Last Change : 2025/11/02 10:40:29.
// =============================================================================

import { DenopsStub } from "@denops/test";
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
