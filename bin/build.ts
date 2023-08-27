import { build, BuildOptions } from "esbuild";
import fs from "fs";
import path from "path";
import prettyBytes from "pretty-bytes";
import { cyan, green } from "console-log-colors";
import logSymbols from "log-symbols";

interface Options extends BuildOptions {
  outfile: string;
}

const options: Options = {
  entryPoints: ["./src/index.ts"],
  minify: true,
  bundle: true,
  outfile: "./dist/mohaya",
  target: "node20",
  platform: "node",
  format: "cjs",
  sourcemap: false,
};

// Log success message
const logSuccess = () => {
  const distSize = fs.statSync(path.resolve(options.outfile)).size;
  const prettySize = prettyBytes(distSize, { space: false });
  console.log(
    options.outfile,
    "|",
    cyan(prettySize),
  );
  console.log(logSymbols.success, green("Finished successfully!"));
};

// Build and log result
build(options)
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .then(logSuccess);
