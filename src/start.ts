import { getConsoleLogger, main } from "@darthcav/ts-utils"
import pkg from "../package.json" with { type: "json" }
import { launcher } from "./index.ts"

const logger = await getConsoleLogger(pkg.name)
main(pkg.name, logger, launcher)
