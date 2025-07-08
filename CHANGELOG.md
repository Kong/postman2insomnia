# Changelog

All notable changes to the Postman to Insomnia CLI converter will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.1] - 2025-07-08

### Added
- **New Legacy Preprocessing Rules** - Extended support for additional deprecated Postman syntax patterns:
  - `legacy-postman-test` - Converts `postman.test()` → `pm.test()`
  - `legacy-postman-expect` - Converts `postman.expect()` → `pm.expect()`
  - `legacy-postman-environment-set` - Converts `postman.environment.set()` → `pm.environment.set()`
  - `legacy-postman-environment-get` - Converts `postman.environment.get()` → `pm.environment.get()`
  - `legacy-postman-globals-set` - Converts `postman.globals.set()` → `pm.globals.set()`
  - `legacy-postman-globals-get` - Converts `postman.globals.get()` → `pm.globals.get()`

### Fixed
- **Legacy Test Methods** - Support for older collections using `postman.test()` and `postman.expect()` syntax
- **Legacy Environment/Global Methods** - Conversion of dot-notation `postman.environment.*` and `postman.globals.*` calls

### Enhanced
- **Preprocessing Coverage** - Expanded detection and conversion of legacy syntax patterns found in older Postman collections
- **Unit Test Coverage** - Added comprehensive tests for all new legacy preprocessing rules

## [1.2.0] - 2025-07-06

### Added
- **Transform System** - Extensible regex-based preprocessing and postprocessing system
- **Script Compatibility Engine** - Automatically fixes API differences between Postman and Insomnia
- **Preprocessing Transforms** - Fix deprecated Postman syntax in raw JSON before conversion
- **Postprocessing Transforms** - Fix Insomnia API differences in converted scripts
- **Custom Transform Configuration** - Support for user-defined transform rules via config files
- **Enhanced CLI Options** - New flags for transform control:
  - `--preprocess` - Apply preprocessing transforms to fix deprecated Postman syntax
  - `--postprocess` - Apply postprocessing transforms to fix Insomnia API differences
  - `--config-file <path>` - Use custom transform configuration file
  - `--generate-config <path>` - Generate sample transform configuration file
- **Config Subcommand** - New `config` command with validate and generate options
- **Comprehensive Documentation** - Added transform-system.md guide with examples and troubleshooting

### Fixed
- **Header Access Issues** - Automatic fix for `insomnia.response.headers.get(...).includes is not a function` errors
- **API Method Differences** - Converts incompatible method calls between Postman and Insomnia APIs
- **Deprecated Postman Syntax** - Automatically updates legacy `postman.*` and `tests[]` syntax
- **String Comparison Failures** - Fixes header value comparisons that fail due to object vs string differences
- **Request Header Manipulation** - Converts `insomnia.request.headers.add()` to proper `addHeader()` calls

### Changed
- **Script Processing Pipeline** - Enhanced script conversion with two-stage transform system
- **Error Handling** - Improved error messages for transform-related issues
- **CLI Architecture** - Restructured command parsing to support new transform options

### Technical Details
- **Default Transform Rules** - Ships with comprehensive set of rules for common compatibility issues:
  - `pm.responseHeaders[...]` → `pm.response.headers.get(...)`
  - Legacy `postman.*` calls → modern `pm.*` equivalents
  - Header object property access fixes for Insomnia API
  - Request manipulation method conversions
- **Configurable Rules Engine** - JSON-based configuration system for custom transform rules
- **Pattern Matching** - Robust regex engine with support for complex replacement patterns
- **Rule Categories** - Organized into preprocessing (raw JSON) and postprocessing (converted scripts) stages


## [1.1.1] - 2025-07-01

### Fixed
- Removed unused Postman environment type file

### Added
- Added unit tests

## [1.1.0] - 2025-07-01

### Fixed
- **CRITICAL: ID collision prevention** - Fixed guaranteed ID collisions when converting multiple collections in batch mode
- **UUID format compatibility** - Updated ID generation to match Insomnia v5 native UUID format (e.g., `req_3a58a6ca4455495ba346d6109deffb88`)
- **Batch processing reliability** - Eliminated duplicate IDs across different collection files

### Changed
- **ID Generation Strategy** - Replaced `__REQ_counter__` format with proper UUID-style `req_32hexcharacters` format
- **Collision Resistance** - Enhanced ID uniqueness using file content hash + timestamp + random components
- **Insomnia Import Compatibility** - Generated files now import seamlessly into Insomnia without ID conflicts

### Technical Details
- Removed counter resets that caused guaranteed collisions in batch mode
- Implemented per-file UUID generation with collision-resistant algorithms
- Maintained backward compatibility for all existing functionality
- Added support for crypto.randomUUID() when available for enhanced security

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
