/**
 * @fileoverview Add a description for your module here.
 */

import describeGraph from "@describe";
import invokeGraph from "@invoke";

import { ok } from "./a2/utils";
import { type Params } from "./a2/common";

export { invoke as default, describe };

type GenerationModes = (typeof MODES)[number];

type ModeId = GenerationModes["id"];

type Inputs = {
  context?: LLMContent[];
  "generation-mode"?: ModeId;
} & Record<string, unknown>;

type DescribeInputs = {
  inputs: Inputs;
};

const MODES = [
  {
    id: "./a2.bgl.json#daf082ca-c1aa-4aff-b2c8-abeb984ab66c",
    title: "Generate Text",
    icon: "generative-text",
  },
  {
    id: "./a2.bgl.json#module:image-generator",
    title: "Generate Image",
    icon: "generative-image",
  },
  {
    id: "./audio-generator.bgl.json#module:main",
    title: "Generate Audio",
    icon: "generative-audio",
  },
  {
    id: "./video-generator.bgl.json#module:main",
    title: "Generate Video",
    icon: "generative-video",
  },
  {
    id: "./go-over-list.bgl.json#module:main",
    title: "Think and Execute",
    icon: "generative",
  },
] as const;

const DEFAULT_MODE = MODES[0];

const PROMPT_PORT = "config$prompt";
const ASK_USER_PORT = "config$ask-user";
const LIST_PORT = "config$list";

// Maps the prompt port to various names of the other ports.
const portMapForward = new Map<ModeId, Map<string, string>>([
  [
    MODES[0].id,
    new Map([
      [PROMPT_PORT, "description"],
      [ASK_USER_PORT, "p-chat"],
      [LIST_PORT, "p-list"],
    ]),
  ],
  [MODES[1].id, new Map([[PROMPT_PORT, "instruction"]])],
  [MODES[2].id, new Map([[PROMPT_PORT, "text"]])],
  [MODES[3].id, new Map([[PROMPT_PORT, "instruction"]])],
  [
    MODES[4].id,
    new Map([
      [PROMPT_PORT, "plan"],
      [LIST_PORT, "z-list"],
    ]),
  ],
]);

const portMapReverse = new Map(
  Array.from(portMapForward.entries()).map(([mode, map]) => {
    const inverted = new Map<string, string>();
    for (const [from, to] of map) {
      inverted.set(to, from);
    }
    return [mode, inverted];
  })
);

function translate<T extends Record<string, unknown>>(
  ports: T,
  map: Map<string, string>
): T {
  return Object.fromEntries(
    Object.entries(ports).map(([name, value]) => [map.get(name) || name, value])
  ) as T;
}

function forwardPorts<T extends Record<string, unknown>>(
  mode: ModeId,
  ports: T
): T {
  const forwardingMap = portMapForward.get(mode);
  if (!forwardingMap) return ports;
  return translate(ports, forwardingMap);
}

function receivePorts<T extends Record<string, unknown>>(
  mode: ModeId,
  ports: T
): T {
  const reverseMap = portMapReverse.get(mode);
  if (!reverseMap) return ports;
  return translate(ports, reverseMap);
}

async function invoke({ "generation-mode": mode, ...rest }: Inputs) {
  const $board = mode || DEFAULT_MODE.id;
  return await invokeGraph({ $board, ...forwardPorts($board, rest) });
}

async function describe({ inputs }: DescribeInputs) {
  const mode = inputs["generation-mode"] || DEFAULT_MODE.id;

  const describing = await describeGraph({ url: mode, inputs });
  let modeSchema: Record<string, Schema> = {};
  if (ok(describing)) {
    modeSchema = receivePorts(
      mode,
      describing.inputSchema.properties || modeSchema
    );
  }

  return {
    title: "Generate",
    description: "Uses Gemini to generate content and call tools",
    metadata: {
      icon: "generative",
      tags: ["quick-access", "generative", "experimental"],
      order: 1,
    },
    inputSchema: {
      type: "object",
      properties: {
        "generation-mode": {
          type: "string",
          title: "Mode",
          enum: MODES as unknown as SchemaEnumValue[],
          behavior: ["config", "hint-preview", "reactive", "hint-controller"],
        },
        context: {
          type: "array",
          items: { type: "object", behavior: ["llm-content"] },
          title: "Context in",
        },
        ...modeSchema,
      },
    } satisfies Schema,
    outputSchema: {
      type: "object",
      properties: {
        context: {
          type: "array",
          items: { type: "object", behavior: ["llm-content"] },
          title: "Context out",
        },
      },
    } satisfies Schema,
  };
}
