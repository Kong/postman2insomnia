# Changelog

All notable changes to the Postman to Insomnia CLI converter will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.10.3] - 2025-09-29

### Enhanced
- **Error Handling and Reporting** - Significantly improved error messages and resilience during file conversion

## [1.10.2] - 2025-09-17

### Enhanced
- **Error Message Clarity** - Improved error reporting to show full file paths instead of just filenames
  - Error messages now display complete resolved paths (e.g., `/full/path/to/file.json` instead of `file.json`)
  - Better debugging experience when processing multiple files from different directories

### Technical Details
- **Minimal Implementation** - Changed `path.basename(file)` to `path.resolve(file)` in error messages
- **Test Coverage** - Added unit tests to verify distinct error messages for different file types

## [1.10.1] - 2025-09-14

### Security
- **GitHub Actions Hardening** - Enhanced CI/CD security for OpenSSF Scorecard compliance
  - Added `permissions: read-all` to workflows following principle of least privilege
  - Pinned all GitHub Actions to commit SHAs instead of mutable tags
  - Updated `@eslint/plugin-kit` from 0.3.3 to 0.3.5 (fixes GHSA-xffm-g5w8-qvg7 ReDoS vulnerability)

### Enhanced
- **CI Pipeline Reliability** - Improved test workflow robustness
  - Added `fail-fast: false` to test all Node.js versions independently
  - Removed duplicate checkout steps and improved workflow organization

### Removed
- **Development Scripts** - Cleaned up `clean-build.sh` (functionality available via npm scripts)

## [1.10.0] - 2025-09-13

### Added
- **Postman API Wrapper Handling** - Automatic detection and unwrapping of collections and environments exported via the Postman API
  - Supports collections wrapped in `{ collection: {...} }` format
  - Supports environments wrapped in `{ environment: {...} }` format
  - Zero configuration required - automatically detects wrapper format
  - Maintains full backward compatibility with existing file formats

### Enhanced
- **Type Safety** - Extended `convertPostmanEnvironment()` to accept both direct and wrapped environment objects
- **Verbose Logging** - Added logging when wrapper detection and unwrapping occurs

### Technical Details
- Added `unwrapPostmanJson()` function with type-safe unwrapping and recursive fallback
- Unwrapping occurs early in conversion pipeline before transform application
- Comprehensive unit tests in `postman-api-wrapper-handling.test.ts`

## [1.9.1] - 2025-09-03

### Added
- ** feat(ci): Add OpenSSF Scorecard workflow ** -
  - Added a new GitHub Actions workflow to automatically assess the repository's security posture using the OpenSSF Scorecard. This workflow runs on pushes to main and on a weekly schedule to check for supply-chain security best practices. The results are uploaded to GitHub's code scanning dashboard to provide continuous security insights.

## [1.9.0] - 2025-07-30

### Added
- **Variable Name Transformation** - Automatic conversion of variable names containing dots to underscores for Insomnia compatibility
  - Environment variables: `api.base.url` → `api_base_url`
  - Collection variables: `service.timeout.seconds` → `service_timeout_seconds`
  - Handles multiple dots: `config.database.connection.url` → `config_database_connection_url`
  - Preserves variables without dots unchanged
  - Works with both enabled and disabled variable filtering

### Fixed
- **Authentication Parsing Robustness** - Enhanced authentication handling to support multiple Postman export formats
  - Fixed `bearerAuth?.find is not a function` error with collections like Slack Web API
  - Added support for both array format: `[{key: "token", value: "..."}]` and object format: `{token: "..."}`
  - Improved type safety with proper inline type assertions instead of `any`
  - Enhanced error handling for malformed authentication data
  - Covers Bearer, Basic, API Key, OAuth2, and Digest authentication methods

### Enhanced
- **Type Safety** - Improved TypeScript type handling throughout the conversion pipeline
- **Test Coverage** - Added comprehensive unit tests for variable transformation and authentication handling
- **Error Resilience** - Better handling of edge cases in variable and authentication processing

### Technical Details
- Variable transformation occurs during the core conversion process (not just in scripts)
- Authentication parsing now gracefully handles both standard Postman formats and alternative export formats
- Maintains full backward compatibility with existing collections
- Enhanced collection variable processing with proper key/id/name priority handling

## [1.8.1] - 2025-01-21

### Enhanced
- **Response Examples Enhancement** - Added original request information to response examples
  - Now includes the HTTP method, URL, and headers from the original request that generated each response
  - Provides complete request/response context for better API documentation
  - Maintains backward compatibility with existing response example format

### Fixed
- **Documentation** - Updated examples in the documentation to reflect new originalRequest field inclusion

## [1.8.0] - 2025-01-17

### Added
- **Response Examples Enhancement** - New `--include-response-examples` flag preserves Postman response examples during conversion
  - Appends response examples to request descriptions as structured markdown with JSON code blocks
  - Includes complete response data: status, headers, body, and content type
  - Works with both Postman v2.0 and v2.1 collections
  - Zero configuration with consistent pretty-formatted JSON output
  - Gracefully handles malformed JSON and missing response data

### Enhanced
- **CLI Interface** - Added `--include-response-examples` option to command-line interface
- **Conversion Pipeline** - Extended postman-converter to support response example processing
- **Type Safety** - Added comprehensive TypeScript interfaces for response example handling
- **Documentation** - Added dedicated response examples documentation in `docs/response-examples.md`

### Technical Details
- **Generic Type Support** - Created version-agnostic interfaces to handle both Postman v2.0 and v2.1 response structures
- **Description Preservation** - Enhanced descriptions are appended to existing content without overwriting
- **Error Resilience** - Validates response examples and filters out incomplete data automatically
- **Test Coverage** - Added comprehensive unit test suite covering edge cases and real-world scenarios

## [1.7.2] - 2025-01-16

### Added
- **Deprecation Notice** - Added prominent notice about planned migration to Insomnia core product
  - Notice displayed in README for visibility to new users
  - CLI now shows deprecation warning on startup
  - Advises users to migrate to core Insomnia functionality when available
  - Added `--quiet` flag to suppress deprecation warning

### Enhanced
- **User Communication** - Clear messaging about tool's temporary nature and future migration path
- **Professional Transition** - Transparent communication about product roadmap

## [1.7.1] - 2025-01-16

### Fixed

- **Updated package name** - The package name now matches the binary name of `postman2insomnia`

## [1.7.0] - 2025-01-16

### Removed
- **Merge functionality** - Removed `--merge` / `-m` option and related code
  - Simplified codebase by removing merge-related complexity
  - Focus on core file-to-file conversion functionality
  - Removed `writeMergedOutput` function and associated logic
  - Updated CLI interface to remove merge option
  - Removed merge-related tests and documentation

### Enhanced
- **Type Safety** - Improved TypeScript type definitions with comprehensive JSDoc documentation
  - Added detailed type definitions for Insomnia v5 export format
  - Enhanced type safety throughout the conversion pipeline
  - Added proper type discrimination for union types
  - Improved error handling with stronger typing

### Technical Details
- **Simplified API** - Reduced complexity by removing merge-specific code paths
- **Better Performance** - No longer buffers multiple collections in memory
- **Cleaner Architecture** - Streamlined conversion flow focused on individual file processing
- **Maintained Compatibility** - All existing conversion functionality preserved

### Migration Notes
- **No Breaking Changes** - Core conversion functionality remains unchanged
- **Removed Option** - `--merge` / `-m` flag is no longer available
- **Alternative Workflow** - Use shell commands or scripts for combining multiple outputs if needed

## [1.6.1] - 2025-07-14

### Fixed
- **Environment API Export Support** - Fixed detection of Postman environments exported via the Postman API
  - Environments exported through the API lack the `_postman_variable_scope` field present in UI exports
  - Enhanced `isPostmanEnvironment()` function to use schema-based validation instead of scope field dependency
  - Now validates based on core structural properties: `name` (string) and `values` (array) as per official Postman environment schema
  - Added robustness check for variable structure validation when values array is not empty
  - Improved differentiation between environments and collections by checking for absence of `info` and `item` fields
- **Environment Type Detection** - Updated `convertPostmanEnvironment()` to handle missing `_postman_variable_scope` field
  - Defaults to `'environment'` scope when field is missing (API exports)
  - Fixed variable filtering logic to properly handle `enabled` field (now checks `enabled === false` instead of `!enabled`)
  - Added informative workspace descriptions indicating export source (UI vs API)

### Enhanced
- **Function Documentation** - Added comprehensive JSDoc comments for environment detection and conversion functions
- **Export Visibility** - Made `isPostmanEnvironment()` and `convertPostmanEnvironment()` functions publicly exportable for testing
- **Error Prevention** - Added collection detection safeguards to prevent false positives

### Technical Details
- **Schema Compliance** - Detection now follows official Postman environment JSON schema requirements
- **Backward Compatibility** - Maintains full compatibility with existing UI-exported environments
- **API Export Coverage** - Comprehensive support for environments exported via Postman API endpoints

## [1.6.0] - 2025-07-14

### Added
- **Advanced RegExp Pattern Support** - Transform rules now support both string patterns and native RegExp objects
  - Enables complex patterns with lookbehind/lookahead assertions impossible to express as strings
  - Backward compatible: existing string patterns continue to work unchanged
  - RegExp objects bypass flags property (compiled patterns ignore separate flags)
- **New responseBody Transform Rule** - Automatically converts legacy `responseBody` references to `pm.response.text()`
  - Uses sophisticated pattern: `/(?<![\$\.])\bresponseBody\b(?!\$)/g`
  - Avoids false matches like `foo.responseBody` or `responseBody$variable`
  - Targets standalone `responseBody` references commonly found in older Postman collections

### Enhanced
- **Transform Rule Interface** - Extended `TransformRule.pattern` type from `string` to `string | RegExp`
- **Regex Creation Logic** - Intelligent handling of both string and RegExp pattern types
- **Pattern Complexity Support** - Now supports advanced regex features like:
  - Negative lookbehind: `(?<![\$\.])`
  - Negative lookahead: `(?!\$)`
  - Word boundaries with context awareness
  - Pre-compiled RegExp objects for performance

### Technical Details
- **Backward Compatibility** - Zero breaking changes to existing configurations
- **Performance Optimization** - Pre-compiled RegExp objects avoid repeated compilation costs

### Migration Notes
- **No Action Required** - Existing transform configurations work without changes
- **Optional Enhancement** - Complex patterns can be migrated to RegExp objects for better maintainability
- **Flag Behavior** - When using RegExp objects, the `flags` property is ignored (as expected)

### Example Usage
```typescript
// New RegExp pattern support
{
  name: "responseBody-to-response",
  description: "Convert responseBody to pm.response.text()",
  pattern: /(?<![\$\.])\bresponseBody\b(?!\$)/g,  // ← Native RegExp object
  replacement: "pm.response.text()",
  enabled: true
}

// Existing string patterns continue working
{
  name: "legacy-pattern",
  description: "Existing string pattern",
  pattern: "\\bold_syntax\\b",  // ← String pattern (unchanged)
  replacement: "new_syntax",
  flags: "g",
  enabled: true
}
```

### Test Coverage
- RegExp pattern functionality with complex assertions
- Backward compatibility with existing string patterns
- Edge case handling for `responseBody` transformations
- Error handling for invalid patterns

## [1.5.0] - 2025-07-10

### Added
- **Support for experimental rules** - New `--experimental` flag to make use of experimental pre and post processing rules
  - These are replacement rules that have not been confirmed by the Insomnia team yet.
   - The replacements implemented by these rules are suspected to be correct but are not 100% confirmed

## [1.4.0] - 2025-07-09

### Added
- **Collection Folder Structure Option** - New `--use-collection-folder` flag to add collection name as containing folder
  - Creates nested structure: `Collection Name > Collection Name > Folders/Requests`
  - Matches Insomnia UI conversion behavior more closely
  - Optional flag with backward compatibility (defaults to `false`)
  - Will become default behavior in future version for UI consistency

### Enhanced
- **Flexible Folder Organization** - Users can now choose between:
  - Original structure (default): `Collection Name > Folders/Requests`
  - Nested structure (new): `Collection Name > Collection Name > Folders/Requests`
- **Type Safety** - Updated `Converter` interface to support new optional parameter
- **CLI Documentation** - Added help text and examples for new folder structure option

### Technical Details
- Extended `ImportPostman` class with optional `addCollectionFolder` parameter
- Updated conversion pipeline to support both folder structure modes
- Maintained full backward compatibility with existing conversions
- Added comprehensive unit tests for both structure modes

### Usage Examples
```bash
# Default behavior (original structure)
postman2insomnia collection.json

# New nested structure (matches Insomnia UI)
postman2insomnia collection.json --use-collection-folder

# Combined with other options
postman2insomnia collection.json --use-collection-folder --preprocess --postprocess
```

**Note**: The default behavior remains unchanged for backward compatibility. In a future major version, `--use-collection-folder` will become the default to better match Insomnia UI behavior.

## [1.3.0] - 2025-07-09

- **Fix ordering issue** - corrected how the CLI generates the keys for sorting requests

## [1.2.2] - 2025-07-09

### Added
- **Legacy Workflow Control Rule** - Added support for deprecated Postman workflow control syntax:
  - `legacy-set-next-request` - Converts `postman.setNextRequest()` → `pm.execution.setNextRequest()`

### Fixed
- **Workflow Execution Issues** - Resolves conversion problems with legacy collections using `postman.setNextRequest("Step Name")` syntax
- **Request Chain Compatibility** - Ensures proper conversion of workflow control logic for sequential request execution

### Enhanced
- **Preprocessing Coverage** - Extended legacy syntax detection to include workflow control methods
- **Unit Test Coverage** - Added comprehensive tests for the new `legacy-set-next-request` preprocessing rule

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

**Note**: This changelog will be updated with each release to track all changes, improvements, and bug fixes.
