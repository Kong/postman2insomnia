#!/usr/bin/env node

// =============================================================================
// POSTMAN TO INSOMNIA CLI CONVERTER
// =============================================================================
// This is the main CLI entry point for converting Postman collections and
// environments to Insomnia v5 YAML format.
//
// The tool was built by extracting and adapting core conversion logic from
// Insomnia's open-source codebase to create a standalone CLI utility.
//
// USAGE:
//   postman2insomnia [options] <input-files...>
//   postman2insomnia collection.json -o ./output -v
//   postman2insomnia *.json --merge --verbose
// =============================================================================

import { Command } from 'commander';
import { convertPostmanToInsomnia } from './converter';
import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import { readFileSync } from 'fs';
import { join } from 'path';

// =============================================================================
// PROGRAM SETUP AND CONFIGURATION
// =============================================================================

const program = new Command();

/**
 * CLI Options Interface
 * Defines all command-line options that can be passed to the tool
 */
interface CliOptions {
  /** Output directory for converted files (default: './output') */
  output?: string;

  /** Output format - currently only YAML is supported (JSON was planned but not implemented) */
  format: 'yaml' | 'json';

  /** Whether to merge all collections into a single output file */
  merge: boolean;

  /** Enable verbose logging for debugging and detailed output */
  verbose: boolean;
}

// =============================================================================
// COMMAND DEFINITION AND ARGUMENT PARSING
// =============================================================================

const packageJson = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf8'));

program
  // Basic program metadata
  .name('postman2insomnia')
  .description('Convert Postman collections to Insomnia v5 format')
  .version(packageJson.version)

  // Main input argument - accepts multiple files or glob patterns
  // Examples: collection.json, *.json, postman-exports/*.json
  .argument('<input...>', 'Postman collection files or glob patterns')

  // CLI Options with defaults and descriptions
  .option('-o, --output <dir>', 'Output directory', './output')
  .option('-f, --format <format>', 'Output format (yaml|json)', 'yaml')
  .option('-m, --merge', 'Merge all collections into a single file', false)
  .option('-v, --verbose', 'Verbose output', false)

  // Main action handler - this is where the actual work happens
  .action(async (inputs: string[], options: CliOptions) => {
    try {
      // =======================================================================
      // INITIALIZATION AND VALIDATION
      // =======================================================================

      console.log(chalk.blue('🔄 Converting Postman collections to Insomnia v5 format...\n'));

      // Expand glob patterns and validate input files
      // This handles cases like *.json, postman-exports/*.json, etc.
      const files = await expandInputs(inputs);

      // Early exit if no valid files found
      if (files.length === 0) {
        console.error(chalk.red('❌ No files found matching the input patterns'));
        process.exit(1);
      }

      // Show discovered files in verbose mode
      if (options.verbose) {
        console.log(chalk.gray(`Found ${files.length} file(s):`));
        files.forEach(file => console.log(chalk.gray(`  - ${file}`)));
        console.log();
      }

      // =======================================================================
      // OUTPUT DIRECTORY SETUP
      // =======================================================================

      // Ensure output directory exists, create if it doesn't
      // Using path.resolve() to handle relative paths correctly
      const outputDir = path.resolve(options.output || './output');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // =======================================================================
      // MAIN CONVERSION PROCESS
      // =======================================================================

      // Call the main conversion function with all options
      // This handles the heavy lifting of parsing and converting files
      const results = await convertPostmanToInsomnia(files, {
        outputDir,
        format: options.format,
        merge: options.merge,
        verbose: options.verbose
      });

      // =======================================================================
      // RESULTS REPORTING
      // =======================================================================

      // Report success/failure statistics
      console.log(chalk.green(`✅ Successfully converted ${results.successful} collection(s)`));

      // Warn about any failures
      if (results.failed > 0) {
        console.log(chalk.yellow(`⚠️  ${results.failed} collection(s) failed to convert`));
      }

      // Show where the output files were written
      console.log(chalk.blue(`📁 Output directory: ${outputDir}`));

    } catch (error) {
      // =======================================================================
      // ERROR HANDLING
      // =======================================================================

      // Handle any unexpected errors during conversion
      console.error(chalk.red('❌ Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Expands input arguments into a list of actual file paths
 *
 * This function handles:
 * 1. Direct file paths (collection.json)
 * 2. Glob patterns (*.json, postman-exports/*.json)
 * 3. Filtering for JSON files only
 * 4. Removing duplicates
 * 5. Validating file existence
 *
 * @param inputs Array of input strings (file paths or glob patterns)
 * @returns Promise<string[]> Array of resolved file paths
 */
async function expandInputs(inputs: string[]): Promise<string[]> {
  const files: string[] = [];

  // Process each input argument
  for (const input of inputs) {
    // Check if it's a direct file path
    if (fs.existsSync(input) && fs.statSync(input).isFile()) {
      // Direct file path - add to list
      files.push(path.resolve(input));
    } else {
      // Treat as glob pattern and find matching files
      const matches = await glob(input, {
        // Exclude common directories we don't want to search
        ignore: ['node_modules/**', '.git/**'],
        // Return absolute paths for consistency
        absolute: true
      });
      files.push(...matches);
    }
  }

  // ==========================================================================
  // FILE FILTERING AND VALIDATION
  // ==========================================================================

  // Remove duplicates using Set, then filter for:
  // 1. JSON files only (must end with .json)
  // 2. Files that actually exist on the filesystem
  return [...new Set(files)].filter(file =>
    file.endsWith('.json') && fs.existsSync(file)
  );
}

// =============================================================================
// PROGRAM EXECUTION
// =============================================================================

// Parse command line arguments and execute the program
// This must be at the end of the file
program.parse();

// =============================================================================
// NOTES FOR MAINTAINERS
// =============================================================================

/*
ARCHITECTURE OVERVIEW:
├── cli.ts (this file) - Command line interface and argument parsing
├── converter.ts - Main conversion orchestration and Insomnia v5 format generation
├── postman-converter.ts - Core Postman collection parsing logic (adapted from Insomnia)
├── postman-env.ts - Postman environment file conversion
└── types/ - TypeScript definitions for Postman v2.0/v2.1 and entities

KEY DEPENDENCIES:
- commander: CLI argument parsing and command structure
- chalk: Colored console output for better UX
- glob: File pattern matching for batch operations
- js-yaml: YAML generation for Insomnia-compatible output

SUPPORTED INPUT FORMATS:
- Postman Collection v2.0/v2.1 JSON files
- Postman Environment JSON files (including globals)
- Auto-detection based on file content structure

OUTPUT FORMAT:
- Insomnia v5 YAML format only
- collection.insomnia.rest/5.0 for collections
- environment.insomnia.rest/5.0 for environments

COMMON MAINTENANCE TASKS:
1. Adding new CLI options: Add to CliOptions interface and program.option()
2. Changing output formats: Modify converter.ts writeOutput functions
3. Supporting new Postman versions: Add new type definitions in types/
4. Error handling improvements: Check error handling in converter.ts

DEBUGGING TIPS:
- Use --verbose flag to see detailed processing information
- Check converter.ts for actual conversion logic issues
- Postman format changes usually require updates to postman-converter.ts

KNOWN LIMITATIONS:
- Only supports Insomnia v5 format (not v4 or older)
- Some complex authentication flows are simplified
- Requires Node.js runtime (not a standalone binary)
- YAML output only (JSON output option exists but not fully implemented)
*/
