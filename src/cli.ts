#!/usr/bin/env node

// =============================================================================
// POSTMAN TO INSOMNIA CLI CONVERTER - WITH TRANSFORM SUPPORT
// =============================================================================
// This is the main CLI entry point for converting Postman collections and
// environments to Insomnia v5 YAML format, now with transform support.
//
// The tool was built by extracting and adapting core conversion logic from
// Insomnia's open-source codebase to create a standalone CLI utility.
//
// USAGE:
//   postman2insomnia [options] <input-files...>
//   postman2insomnia collection.json -o ./output -v
//   postman2insomnia *.json --verbose --preprocess --postprocess
// =============================================================================

import { Command } from 'commander';
import { convertPostmanToInsomnia } from './converter';
import { generateSampleConfig } from './transform-engine';
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
 * Enhanced CLI Options Interface with Transform Support
 */
interface CliOptions {
  /** Output directory for converted files (default: './output') */
  output?: string;

  /** Output format - currently only YAML is supported (JSON was planned but not implemented) */
  format: 'yaml' | 'json';

  /** Enable verbose logging for debugging and detailed output */
  verbose: boolean;

  /** Enable preprocessing transforms on raw Postman JSON */
  preprocess?: boolean;

  /** Enable postprocessing transforms on converted scripts */
  postprocess?: boolean;

  /** Path to custom transform configuration file */
  configFile?: string;

  /** Generate a sample transform configuration file */
  generateConfig?: string;

  /** Add collection name as containing folder for all items */
  useCollectionFolder?: boolean;

  /** Add flga to use experimental rules */
  experimental?: boolean;
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
  .argument('[input...]', 'Postman collection files or glob patterns')

  // CLI Options with defaults and descriptions
  .option('-o, --output <dir>', 'Output directory', './output')
  .option('-f, --format <format>', 'Output format (yaml|json)', 'yaml')
  .option('-v, --verbose', 'Verbose output', false)

  // Transform options
  .option('--preprocess', 'Apply preprocessing transforms to fix deprecated Postman syntax', false)
  .option('--postprocess', 'Apply postprocessing transforms to fix Insomnia API differences', false)
  .option('--config-file <path>', 'Path to custom transform configuration file')
  .option('--generate-config <path>', 'Generate a sample transform configuration file and exit')

  // Might be needed for accurate conversions: Add the collection folder option
  .option('--use-collection-folder', 'Add collection name as containing folder for all items', false)

  // Apply experimental rules
  .option('--experimental', 'Enable experimental transform rules (not confirmed by Insomnia team)', false)

  // Main action handler - this is where the actual work happens
  .action(async (inputs: string[], options: CliOptions) => {
    try {
      // =======================================================================
      // CONFIG GENERATION (EXIT EARLY)
      // =======================================================================

      if (options.generateConfig) {
        generateSampleConfig(options.generateConfig);
        console.log(chalk.green(`✅ Sample configuration generated at: ${options.generateConfig}`));
        console.log(chalk.blue('Edit this file to customize transformation rules.'));
        process.exit(0);
      }

      // =======================================================================
      // INITIALIZATION AND VALIDATION
      // =======================================================================

      console.log(chalk.blue('🔄 Converting Postman collections to Insomnia v5 format...\n'));

      // Expand glob patterns and validate input files
      // This handles cases like *.json, postman-exports/*.json, etc.
      const files = await expandInputs(inputs || []);

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
        verbose: options.verbose,
        preprocess: options.preprocess,
        postprocess: options.postprocess,
        configFile: options.configFile,
        useCollectionFolder: options.useCollectionFolder,
        experimental: options.experimental
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

      // Show transform usage if applicable
      if ((options.preprocess || options.postprocess) && options.verbose) {
        console.log(chalk.blue(`🔧 Applied transforms: ${options.preprocess ? 'preprocess ' : ''}${options.postprocess ? 'postprocess' : ''}`));
      }

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
// CONFIG SUBCOMMAND
// =============================================================================

const configCommand = program
  .command('config')
  .description('Transform configuration utilities');

configCommand
  .option('--generate <path>', 'Generate sample transform configuration')
  .option('--validate <path>', 'Validate transform configuration file')
  .action(async (options) => {
    try {
      if (options.generate) {
        generateSampleConfig(options.generate);
        console.log(chalk.green(`✅ Configuration generated at: ${options.generate}`));
        console.log(chalk.blue('Edit this file to customize transformation rules.'));
      } else if (options.validate) {
        if (!fs.existsSync(options.validate)) {
          console.error(chalk.red(`❌ Configuration file not found: ${options.validate}`));
          process.exit(1);
        }

        try {
          const configContent = fs.readFileSync(options.validate, 'utf8');
          JSON.parse(configContent);
          console.log(chalk.green(`✅ Configuration is valid: ${options.validate}`));
        } catch (error) {
          console.error(chalk.red(`❌ Invalid configuration: ${error instanceof Error ? error.message : error}`));
          process.exit(1);
        }
      } else {
        configCommand.help();
      }
    } catch (error) {
      console.error(chalk.red('❌ Config command error:'), error instanceof Error ? error.message : error);
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
├── transform-engine.ts - Extensible transform system for preprocessing and postprocessing
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

TRANSFORM SYSTEM:
- --preprocess: Fixes deprecated Postman syntax before conversion
- --postprocess: Fixes Insomnia API differences after conversion
- --config-file: Use custom transform rules
- --generate-config: Create sample configuration file

COMMON MAINTENANCE TASKS:
1. Adding new CLI options: Add to CliOptions interface and program.option()
2. Changing output formats: Modify converter.ts writeOutput functions
3. Supporting new Postman versions: Add new type definitions in types/
4. Error handling improvements: Check error handling in converter.ts
5. Adding new transforms: Update transform-engine.ts and default configs

DEBUGGING TIPS:
- Use --verbose flag to see detailed processing information
- Check converter.ts for actual conversion logic issues
- Postman format changes usually require updates to postman-converter.ts
- Use --generate-config to create sample transform configurations

KNOWN LIMITATIONS:
- Only supports Insomnia v5 format (not v4 or older)
- Some complex authentication flows are simplified
- Requires Node.js runtime (not a standalone binary)
- YAML output only (JSON output option exists but not fully implemented)

TRANSFORM SYSTEM USAGE:
- Basic: postman2insomnia collection.json --preprocess --postprocess
- Custom: postman2insomnia collection.json --config-file ./my-config.json
- Generate: postman2insomnia --generate-config ./my-config.json
*/
