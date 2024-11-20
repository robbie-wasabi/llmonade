import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

const exampleName = process.argv[2];

async function main() {
    if (!exampleName) {
        const examples = await fs.readdir("examples");
        console.log("Available examples:");
        examples.forEach((file) => {
            if (file.endsWith(".ts")) {
                console.log(`  - ${file.replace(".ts", "")}`);
            }
        });
        process.exit(0);
    }

    const examplePath = path.join("examples", `${exampleName}.ts`);

    try {
        await fs.access(examplePath);
    } catch {
        console.error(`Example '${exampleName}' not found`);
        process.exit(1);
    }

    spawn("node", ["--loader", "ts-node/esm", examplePath], {
        stdio: "inherit",
    });
}

main();
