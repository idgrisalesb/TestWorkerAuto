/**
 * Minimal CLI argument parser. Supports --key value and --flag patterns.
 * No external dependencies.
 *
 * Usage:
 *   const args = parseArgs(process.argv.slice(2))
 *   args.summary  // value of --summary
 *   args._        // positional arguments
 */

function parseArgs(argv) {
  const result = { _: [] }
  let i = 0
  while (i < argv.length) {
    const arg = argv[i]
    if (arg.startsWith('--')) {
      const key = arg.slice(2)
      const next = argv[i + 1]
      if (next && !next.startsWith('--')) {
        result[key] = next
        i += 2
      } else {
        result[key] = true
        i += 1
      }
    } else {
      result._.push(arg)
      i += 1
    }
  }
  return result
}

/** Validate required args, exit with usage message if missing */
function requireArgs(args, required, usage) {
  const missing = required.filter((k) => !args[k])
  if (missing.length) {
    console.error(`Error: missing required arguments: ${missing.map((k) => `--${k}`).join(', ')}`)
    if (usage) console.error(`\nUsage: ${usage}`)
    process.exit(1)
  }
}

module.exports = { parseArgs, requireArgs }
