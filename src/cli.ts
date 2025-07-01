#!/usr/bin/env node

import { Command } from 'commander';
import { convertPostmanToInsomnia } from './converter';
import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

const program = new Command();

interface CliOptions {
  output?: string;
  format: 'yaml' | 'json';
  merge: boolean;
  verbose: boolean;
}

program
  .name('postman2insomnia')
  .description('Convert Postman collections to Insomnia v5 format')
  .version('1.0.0')
  .argument('<input...>', 'Postman collection files or glob patterns')
  .option('-o, --output <dir>', 'Output directory', './output')
  .option('-f, --format <format>', 'Output format (yaml|json)', 'yaml')
  .option('-m, --merge', 'Merge all collections into a single file', false)
  .option('-v, --verbose', 'Verbose output', false)
  .action(async (inputs: string[], options: CliOptions) => {
    try {
      console.log(chalk.blue('🔄 Converting Postman collections to Insomnia v5 format...\n'));

      // Expand glob patterns
      const files = await expandInputs(inputs);

      if (files.length === 0) {
        console.error(chalk.red('❌ No files found matching the input patterns'));
        process.exit(1);
      }

      if (options.verbose) {
        console.log(chalk.gray(`Found ${files.length} file(s):`));
        files.forEach(file => console.log(chalk.gray(`  - ${file}`)));
        console.log();
      }

      // Ensure output directory exists
      const outputDir = path.resolve(options.output || './output');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const results = await convertPostmanToInsomnia(files, {
        outputDir,
        format: options.format,
        merge: options.merge,
        verbose: options.verbose
      });

      console.log(chalk.green(`✅ Successfully converted ${results.successful} collection(s)`));
      if (results.failed > 0) {
        console.log(chalk.yellow(`⚠️  ${results.failed} collection(s) failed to convert`));
      }
      console.log(chalk.blue(`📁 Output directory: ${outputDir}`));

    } catch (error) {
      console.error(chalk.red('❌ Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

async function expandInputs(inputs: string[]): Promise<string[]> {
  const files: string[] = [];

  for (const input of inputs) {
    if (fs.existsSync(input) && fs.statSync(input).isFile()) {
      // Direct file path
      files.push(path.resolve(input));
    } else {
      // Glob pattern
      const matches = await glob(input, {
        ignore: ['node_modules/**', '.git/**'],
        absolute: true
      });
      files.push(...matches);
    }
  }

  // Remove duplicates and filter for JSON files
  return [...new Set(files)].filter(file =>
    file.endsWith('.json') && fs.existsSync(file)
  );
}

program.parse();
