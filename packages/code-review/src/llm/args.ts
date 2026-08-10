export type LlmCliArgs = {
  project: string;
  file: string;
  staticFile: string;
  diffFile: string;
  output: string;
};

export function parseArgs(argv: string[]): LlmCliArgs {
  const args: LlmCliArgs = {
    project: "",
    file: "",
    staticFile: "",
    diffFile: "",
    output: "",
  };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--project") args.project = argv[++i] ?? "";
    else if (arg === "--file") args.file = argv[++i] ?? "";
    else if (arg === "--static-file") args.staticFile = argv[++i] ?? "";
    else if (arg === "--diff-file") args.diffFile = argv[++i] ?? "";
    else if (arg === "--output") args.output = argv[++i] ?? "";
    else if (arg.startsWith("--project=")) args.project = arg.slice(10);
    else if (arg.startsWith("--file=")) args.file = arg.slice(7);
    else if (arg.startsWith("--static-file=")) args.staticFile = arg.slice(14);
    else if (arg.startsWith("--diff-file=")) args.diffFile = arg.slice(12);
    else if (arg.startsWith("--output=")) args.output = arg.slice(9);
  }
  return args;
}

export function inferStack(file: string): string {
  if (file.endsWith(".tsx")) return "TypeScript / React";
  if (file.endsWith(".ts")) return "TypeScript";
  if (file.endsWith(".jsx")) return "JavaScript / React";
  if (/\.(js|mjs|cjs)$/.test(file)) return "JavaScript";
  if (file.endsWith(".php")) return "PHP";
  if (/\.(css|scss)$/i.test(file)) return "CSS";
  if (file.includes("constants/layout.ts")) return "Tailwind / layout.ts";
  return "—";
}
