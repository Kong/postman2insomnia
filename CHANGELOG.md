# Changelog

All notable changes to the Postman to Insomnia CLI converter will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-07-01

### Added
- **Initial release** of Postman to Insomnia CLI converter
- **Postman Collection support** - Convert v2.0 and v2.1 collections to Insomnia v5 YAML format
- **Postman Environment support** - Convert environment and global variable files
- **Auto-detection** of file types (collections vs environments)
- **Batch processing** - Convert multiple files in a single command
- **Merge functionality** - Combine multiple collections into one output file
- **CLI interface** with Commander.js for user-friendly command-line usage
- **Global installation** support via `npm install -g .`
- **Verbose logging** option for debugging conversion process
- **YAML output format** compatible with Insomnia v5 import

### Core Features
- **Request conversion** - Full support for HTTP methods, URLs, headers, and parameters
- **Folder structure preservation** - Maintains Postman folder organization as request groups
- **Authentication handling** - Converts Basic, Bearer, OAuth, API Key, and other auth methods
- **Script conversion** - Transforms pre-request and post-response scripts from `pm.*` to `insomnia.*` syntax
- **Variable processing** - Preserves collection and environment variables
- **Body content support** - Handles raw, form-data, x-www-form-urlencoded, and GraphQL bodies
- **Disabled variable filtering** - Automatically excludes disabled environment variables

### Technical Implementation
- **Insomnia source adaptation** - Built by extracting and adapting core conversion logic from Insomnia's open-source codebase
- **Zod schema compliance** - Ensures generated files pass Insomnia v5 validation
- **TypeScript implementation** - Full type safety and modern JavaScript features
- **Discriminated union support** - Proper handling of different Insomnia v5 item types (Request, RequestGroup, WebSocket, gRPC)
- **File I/O operations** - Robust file reading, writing, and glob pattern support

### CLI Options
- `--output <dir>` / `-o` - Specify output directory (default: `./output`)
- `--merge` / `-m` - Merge all collections into a single file
- `--verbose` / `-v` - Enable detailed logging
- `--help` / `-h` - Display help information
- `--version` / `-V` - Show version number

### Dependencies
- **Commander.js** - CLI argument parsing and command structure
- **js-yaml** - YAML generation for Insomnia-compatible output
- **chalk** - Colored console output for better user experience
- **glob** - File pattern matching for batch operations

### File Support
- **Input formats**: Postman Collection v2.0/v2.1 JSON, Postman Environment JSON
- **Output format**: Insomnia v5 YAML (`collection.insomnia.rest/5.0`, `environment.insomnia.rest/5.0`)
- **Auto-detection**: Automatically identifies file types based on content structure

### Known Limitations
- **Authentication simplification** - Some complex auth flows are simplified but remain functional
- **v5 format only** - Does not support older Insomnia formats
- **Node.js dependency** - Requires Node.js runtime environment
- **YAML output only** - Does not generate JSON output (Insomnia primarily uses YAML for v5 imports)

### Development Notes
- Adapted from Insomnia source files: `postman-converter.ts`, `insomnia-v5.ts`, `import-v5-parser.ts`, `postman-env.ts`
- Removed UI dependencies and database integration for standalone CLI operation
- Maintained compatibility with original Insomnia conversion logic
- Added comprehensive error handling and user feedback

---

## Future Planned Features

### [Unreleased]
- Enhanced authentication method support
- Better error messages and validation
- Support for additional Postman features
- Performance optimizations for large collections
- Configuration file support
- Plugin system for custom transformations

---

**Note**: This changelog will be updated with each release to track all changes, improvements, and bug fixes.
