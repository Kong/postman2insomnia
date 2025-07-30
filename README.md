# Postman to Insomnia CLI Converter

> **⚠️ Important Notice**: The Postman2Insomnia repo is now public as a short-term workaround while this functionality moves into the Insomnia. Though this repo will likely remain public, we of course advise moving to the core product functionality as soon as it meets your needs.

A powerful command-line tool that converts Postman collections and environments to Insomnia v5 YAML format with advanced script compatibility features and flexible folder organization. This tool was built by extracting and adapting the core conversion logic from Insomnia's UI codebase to create a standalone CLI utility.

## Features

### Core Conversion
- **Converts Postman Collections** (v2.0 and v2.1) to Insomnia v5 YAML format
- **Converts Postman Environments** (including globals) to Insomnia v5 YAML format
- **Batch processing** of multiple files with glob pattern support
- **Preserves folder structure** and request organization
- **Handles authentication** methods (Basic, Bearer, OAuth, API Key, etc.)
- **Maintains variables** and environment data
- **Filters disabled variables** from environments
- **Auto-detects file types** (collection vs environment)
- **Captures Postman Responses** Stores Postman request responses as request description in `Markdown`

### Folder Structure Options
- **Flexible folder organization** - Choose between two folder structures:
  - **Original structure** (default): `Collection Name > Folders/Requests`
  - **Nested structure**: `Collection Name > Collection Name > Folders/Requests`
- **Insomnia UI compatibility** - Nested structure matches how Insomnia UI performs conversions
- **Backward compatibility** - Default behavior preserved for existing workflows
- **Future-ready** - Nested structure will become default in future major version

### Transform System
- **Preprocessing transforms** - Fix deprecated Postman syntax before conversion
- **Postprocessing transforms** - Fix Insomnia API differences after conversion
- **Script compatibility engine** - Automatically resolves API differences between Postman and Insomnia
- **Custom transform rules** - Define your own conversion patterns via config files
- **Advanced RegExp support** - Use native RegExp objects for complex patterns with lookbehind/lookahead
- **Built-in compatibility fixes** for common script issues including legacy `responseBody` references

#### Built-in Transform Rules

The tool now includes enhanced built-in rules:

##### Preprocessing Rules
- `deprecated-pm-syntax` - Fix deprecated `pm.responseHeaders[...]` syntax
- `old-postman-vars` - Convert `postman.getEnvironmentVariable()`
- `old-postman-global-vars` - Convert `postman.getGlobalVariable()`
- `legacy-test-syntax` - Convert `tests[...]` assignments
- **NEW (v1.6.0)**: `responseBody-to-response` - Convert legacy `responseBody` references
- `legacy-postman-test` - Convert `postman.test()` calls
- `postman-environment-setter` - Convert `postman.setEnvironmentVariable()`
- `postman-global-setter` - Convert `postman.setGlobalVariable()`
- `responseCode-to-response` - Convert `responseCode.code` references
- `nextRequest-syntax` - Convert `postman.setNextRequest()`

##### Postprocessing Rules
- `fix-header-conditional-access` - Fix header conditionals in Insomnia
- `fix-header-string-comparison` - Fix header string comparisons
- `fix-header-value-access` - Fix header value access patterns
- `fix-request-headers-add` - Convert header addition methods
- `fix-request-url-assignment` - Convert URL assignment syntax

### 🛠️ Script Processing
- **Pre-request and post-response scripts** conversion from `pm.*` to `insomnia.*` syntax
- **Automatic header access fixes** - Resolves `headers.get(...).includes is not a function` errors
- **Legacy syntax updates** - Converts old `postman.*` and `tests[]` syntax to modern equivalents
- **API method compatibility** - Fixes method call differences between platforms

## Installation

### From NPM (Recommended)

```bash
# Install globally from npm
npm install -g postman2insomnia
```

After installation, you can use `postman2insomnia` from anywhere:

```bash
postman2insomnia --version
postman2insomnia --help
```

### From GitHub Repository

```bash
# Clone the repository
git clone https://github.com/KongHQ-CX/postman2insomnia.git
cd postman2insomnia

# Install dependencies
npm install

# Build the project
npm run build

# Install globally
npm install -g .
```

### Local Development

```bash
# Clone the repository
git clone https://github.com/KongHQ-CX/postman2insomnia.git
cd postman2insomnia

# Install dependencies
npm install

# Build the project
npm run build

# Run locally (without global installation)
node dist/cli.js <options>
```

## Usage

### Basic Usage

```bash
# Convert a single Postman collection
postman2insomnia collection.json

# Convert multiple files
postman2insomnia collection1.json collection2.json environment.json

# Use glob patterns
postman2insomnia postman-exports/*.json

# Specify output directory
postman2insomnia collection.json -o ./converted-files

# Enable verbose output
postman2insomnia collection.json -v
```

### Folder Structure Options

```bash
# Default structure: Collection Name > Folders/Requests
postman2insomnia collection.json

# Nested structure (matches Insomnia UI): Collection Name > Collection Name > Folders/Requests
postman2insomnia collection.json --use-collection-folder

# Example result with --use-collection-folder:
# Consumer Finance (collection)
# ├── Consumer Finance (root folder)
# │   ├── Document (subfolder)
# │   │   ├── Step 1. Get Access token
# │   │   └── Step 2. Validate token
# │   └── Token (subfolder)
# │       ├── Kong - Generate token
# │       └── Kong - PSD2
```

### Transform Usage

```bash
# Apply both preprocessing and postprocessing transforms (recommended)
postman2insomnia collection.json --preprocess --postprocess

# Apply only preprocessing (fix deprecated Postman syntax)
postman2insomnia collection.json --preprocess

# Apply only postprocessing (fix Insomnia API differences)
postman2insomnia collection.json --postprocess

# Use custom transform configuration
postman2insomnia collection.json --config-file ./my-transforms.json

# Generate a sample configuration file
postman2insomnia --generate-config ./sample-config.json
```

### Advanced Options

```bash
# Nested structure with transforms
postman2insomnia collection.json --use-collection-folder --preprocess --postprocess

# Batch convert with nested structure and custom transforms
postman2insomnia exports/*.json --use-collection-folder --preprocess --postprocess -o ./output -v

# Use custom config for enterprise collections with nested structure
postman2insomnia enterprise/*.json --use-collection-folder --config-file ./enterprise-transforms.json -o ./converted

# Use experimental rules
postman2insomnia collection.json --preprocess --postprocess --experimental

# Capture Postman response information as Insomnia request descriptions
postman2insomnia collection.json --include-response-examples
```

### Transform Configuration Management

```bash
# Generate sample configuration file
postman2insomnia config --generate ./transforms.json

# Validate configuration file
postman2insomnia config --validate ./transforms.json

# Use configuration in conversion
postman2insomnia collection.json --config-file ./transforms.json
```

### Command Line Options

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--output <dir>` | `-o` | Output directory | `./output` |
| `--verbose` | `-v` | Verbose output | `false` |
| `--use-collection-folder` | | Add collection name as containing folder | `false`* |
| `--experimental` | | Use the experimental pre and post processing rules as well as the defaults | `false`* |
| `--preprocess` | | Apply preprocessing transforms | `false` |
| `--postprocess` | | Apply postprocessing transforms | `false` |
| `--config-file <path>` | | Custom transform configuration file | |
| `--generate-config <path>` | | Generate sample transform configuration | |
| `--help` | `-h` | Show help | |
| `--version` | `-V` | Show version | |
| `--quiet` | | Suppress deprecation warning | `false` |
| `--include-response-examples` | | Captures Postman response examples into Insomnia request descriptions | `false` |

*_**Note**: `--use-collection-folder` currently defaults to `false` for backward compatibility. In a future major version, this will become the default behavior to better match how Insomnia UI performs conversions._

## When to Use Options

### Use `--use-collection-folder` when:
- You want the converted structure to match Insomnia UI behavior
- You prefer nested folder organization: `Collection > Collection > Items`
- You're migrating from Insomnia UI imports to CLI workflow
- You want better organization for complex collections

### Use `--preprocess` when:
- Converting old Postman collections with deprecated syntax
- Scripts use legacy `postman.*` methods instead of `pm.*`
- You see `tests[...]` syntax in scripts
- Collections use outdated variable access patterns

### Use `--postprocess` when:
- Converted scripts fail in Insomnia with method errors
- You get "`headers.get(...).includes is not a function`" errors
- Header comparisons don't work as expected
- Request manipulation methods fail

### Use both transforms (recommended):
```bash
postman2insomnia collection.json --preprocess --postprocess
```

### Use nested structure with transforms (recommended for new projects):
```bash
postman2insomnia collection.json --use-collection-folder --preprocess --postprocess
```

## File Types Supported

### Postman Collections
- **Format**: Postman Collection v2.0 and v2.1
- **Output**: `collection.insomnia.rest/5.0` YAML format
- **Contains**: Requests, folders, authentication, scripts, variables

### Postman Environments
- **Format**: Postman Environment exports (including globals)
- **Output**: `environment.insomnia.rest/5.0` YAML format
- **Contains**: Environment variables, global variables
- **Note**: Disabled variables are automatically filtered out

## Examples

### Convert with Nested Structure (Recommended)

```bash
# Input: my-api.json (Postman collection)
postman2insomnia my-api.json --use-collection-folder --preprocess --postprocess

# Output: ./output/my-api.insomnia.yaml (with nested structure and working scripts)
# Structure: My API > My API > Folders/Requests
```

### Convert with Original Structure

```bash
# Input: my-api.json (Postman collection)
postman2insomnia my-api.json --preprocess --postprocess

# Output: ./output/my-api.insomnia.yaml (with original structure and working scripts)
# Structure: My API > Folders/Requests
```

### Convert Environments

```bash
# Input: dev-env.json, prod-env.json (Postman environments)
postman2insomnia dev-env.json prod-env.json -o ./envs

# Output:
# ./envs/dev-env.insomnia.yaml
# ./envs/prod-env.insomnia.yaml
```

### Batch Conversion with Nested Structure

```bash
# Convert all exports with nested structure and custom transforms
postman2insomnia postman-exports/*.json \
  --use-collection-folder \
  --config-file ./my-transforms.json \
  -o ./converted \
  -v
```

### Enterprise Workflow

```bash
# 1. Generate custom configuration
postman2insomnia config --generate ./company-transforms.json

# 2. Edit configuration for your needs
# (edit ./company-transforms.json)

# 3. Validate configuration
postman2insomnia config --validate ./company-transforms.json

# 4. Convert with custom rules and nested structure
postman2insomnia collections/*.json \
  --use-collection-folder \
  --config-file ./company-transforms.json \
  -o ./insomnia-imports \
  --verbose
```

## Folder Structure Comparison

### Original Structure (Current Default)
```
Consumer Finance (collection)
├── Document (subfolder)
│   ├── Step 1. Get Access token
│   └── Step 2. Validate token
└── Token (subfolder)
    ├── Kong - Generate token
    └── Kong - PSD2
```

### Nested Structure (--use-collection-folder)
```
Consumer Finance (collection)
├── Consumer Finance (root folder)
│   ├── Document (subfolder)
│   │   ├── Step 1. Get Access token
│   │   └── Step 2. Validate token
│   └── Token (subfolder)
│       ├── Kong - Generate token
│       └── Kong - PSD2
```

The nested structure matches how Insomnia UI performs conversions and provides better organization for complex collections.

## Advanced Transform Configuration Examples

### Advanced Transform Configuration

The transform system now supports both string patterns and native RegExp objects for maximum flexibility:

```json
{
  "preprocess": [
    {
      "name": "string-pattern-example",
      "description": "Traditional string-based pattern",
      "pattern": "\\bold_postman_syntax\\b",
      "replacement": "new_syntax",
      "flags": "g",
      "enabled": true
    }
  ],
  "postprocess": [
    {
      "name": "regexp-pattern-example",
      "description": "Advanced RegExp with lookbehind/lookahead",
      "pattern": "/(?<![\\.\\$])\\bresponseBody\\b(?!\\$)/g",
      "replacement": "pm.response.text()",
      "enabled": true,
      "note": "When using RegExp objects, flags property is ignored"
    }
  ]
}
```

### Complex Pattern Examples

```bash
# Transform files with advanced RegExp patterns
postman2insomnia collection.json --preprocess --postprocess --config-file ./advanced-transforms.json
```

**New in v1.6.0**: RegExp object support enables complex patterns that are impossible to express as strings:

```json
{
  "name": "responseBody-conversion",
  "description": "Convert standalone responseBody references (avoiding properties)",
  "pattern": "/(?<![\\.\\$])\\bresponseBody\\b(?!\\$)/g",
  "replacement": "pm.response.text()",
  "enabled": true
}
```

This pattern:
- ✅ Converts: `responseBody` → `pm.response.text()`
- ❌ Ignores: `object.responseBody` (property access)
- ❌ Ignores: `responseBody$variable` (variable names)

## Pattern Type Support

### Pattern Types

Transform rules support two pattern types:

#### String Patterns (Traditional)
```json
{
  "pattern": "\\bpm\\.responseHeaders\\[(.*?)\\]",
  "flags": "g"
}
```
- Uses traditional regex string syntax with escaping
- Requires separate `flags` property
- Compatible with all existing configurations

#### RegExp Objects (New in v1.6.0)
```json
{
  "pattern": "/(?<![\\.\\$])\\bresponseBody\\b(?!\\$)/g"
}
```
- Native JavaScript RegExp object syntax
- Flags included in the pattern itself
- Enables advanced features like lookbehind/lookahead
- `flags` property ignored when RegExp object is used

### When to Use RegExp Objects

Use RegExp objects for:
- **Complex assertions** requiring lookbehind/lookahead
- **Performance-critical** rules (pre-compiled patterns)
- **Advanced features** not available in string patterns
- **Complex word boundaries** with context awareness

Continue using string patterns for:
- **Simple replacements** and straightforward patterns
- **Legacy compatibility** with existing configurations
- **Dynamic flag assignment** based on conditions

## Migration Guide

### Migrating to v1.6.0

**No breaking changes** - existing configurations work unchanged:

```json
// ✅ Existing string patterns continue working
{
  "pattern": "oldSyntax",
  "replacement": "newSyntax",
  "flags": "g"
}

// ✅ New RegExp patterns available for complex cases
{
  "pattern": "/(?<!prefix)\\btarget\\b(?!suffix)/g",
  "replacement": "replacement"
}
```

**Optional enhancements** available:
- Migrate complex string patterns to RegExp objects for better readability
- Use lookbehind/lookahead for more precise matching
- Leverage pre-compiled patterns for performance gains

### Backward Compatibility

- ✅ All existing transform configurations work without changes
- ✅ String patterns with flags continue to function identically
- ✅ No modification required for existing workflows
- ✅ RegExp object support is purely additive

## Response Examples Enhancement

### Overview

Postman collections sometimes contain response examples that demonstrate expected API behaviour. By default, these examples are lost during conversion because Insomnia doesn't have an equivalent feature. The Response Examples Enhancement solves this by preserving these examples as structured markdown in request descriptions.

### Quick Start

Enable response examples preservation with a single flag:

```bash
# Basic usage
postman2insomnia collection.json --include-response-examples

# Combined with other options
postman2insomnia collection.json \
  --include-response-examples \
  --output ./converted \
  --verbose
```

### What You Get

**Before** (Postman description):
```
This endpoint uploads documents for processing.
```

**After** (Enhanced Insomnia description):
````markdown
This endpoint uploads documents for processing.

## Response Examples

### Request Example 1: Successful Upload

```json
{
  "method": "POST",
  "url": "https://api.example.com/upload",
  "headers": {
    "Authorization": "Bearer {{token}}",
    "Content-Type": "multipart/form-data"
  },
  "body": {
    "mode": "formdata",
    "formdata": [
      {
        "key": "file",
        "value": "document.pdf",
        "type": "file",
        "description": "Document file to upload"
      },
      {
        "key": "category",
        "value": "financial",
        "type": "text"
      }
    ]
  }
}
```

### Response Example 1: Successful Upload

```json
{
  "name": "Successful Upload",
  "status": "OK",
  "code": 200,
  "headers": {
    "Content-Type": "application/json"
  },
  "body": {
    "id": "doc123",
    "status": "uploaded",
    "message": "Document processed successfully"
  },
  "contentType": "json"
}
```

### Request Example 2: Bad Request

```json
{
  "method": "POST",
  "url": "https://api.example.com/upload",
  "headers": {
    "Authorization": "Bearer {{token}}",
    "Content-Type": "multipart/form-data"
  },
  "body": {
    "mode": "formdata",
    "formdata": [
      {
        "key": "file",
        "value": "invalid-file.txt",
        "type": "file",
        "description": "Invalid file format"
      }
    ]
  }
}
```

### Response Example 2: Bad Request

```json
{
  "name": "Bad Request",
  "status": "Bad Request",
  "code": 400,
  "headers": {
    "Content-Type": "application/json"
  },
  "body": {
    "error": "Invalid file format",
    "code": "INVALID_FORMAT",
    "message": "Only PDF and image files are supported"
  },
  "contentType": "json"
}
```

### Key Features

- ✅ **Preserves all response examples** from your Postman collections
- ✅ **Appends to existing descriptions** without overwriting content
- ✅ **Pretty-formatted JSON** with proper indentation for readability
- ✅ **Complete response data** including status, headers, and body
- ✅ **Works with both** Postman v2.0 and v2.1 collections
- ✅ **Zero configuration** - consistent formatting out of the box

### When to Use

Perfect for teams that:
- Rely on Postman response examples for API documentation
- Want to preserve valuable response documentation during migration
- Need reference examples for expected API responses during development
- Share collections with team members who depend on response examples

---

📖 **For complete documentation, usage examples, and troubleshooting**: [Response Examples Documentation](docs/response-examples.md)


## Common Issues & Solutions

### Script Compatibility Issues

**Problem**: Converted scripts fail with method errors
```javascript
// This fails in Insomnia
if (insomnia.response.headers.get('Content-Type').includes('json')) {
    // Error: headers.get(...).includes is not a function
}
```

**Solution**: Use `--postprocess` flag
```bash
postman2insomnia collection.json --postprocess
```
```javascript
// This works after postprocessing
if (insomnia.response.headers.get('Content-Type').value.includes('json')) {
    // Fixed: .value property added automatically
}
```

### Legacy Postman Syntax

**Problem**: Old collections use deprecated methods
```javascript
// Deprecated syntax
var token = postman.getEnvironmentVariable('auth_token');
tests['Status is 200'] = responseCode.code === 200;
```

**Solution**: Use `--preprocess` flag
```bash
postman2insomnia collection.json --preprocess
```
```javascript
// Updated to modern syntax
var token = pm.environment.get('auth_token');
pm.test('Status is 200', function() { pm.expect(pm.response.code).to.equal(200); });
```

### Folder Structure Preferences

**Problem**: Converted structure doesn't match Insomnia UI imports
```
// CLI default structure
Collection Name > Folders/Requests

// Insomnia UI structure
Collection Name > Collection Name > Folders/Requests
```

**Solution**: Use `--use-collection-folder` flag
```bash
postman2insomnia collection.json --use-collection-folder
```

## Advanced Transform Configuration

### Custom Transform Rules

Create a configuration file to define custom transformation patterns:

```bash
# Generate sample configuration
postman2insomnia --generate-config ./custom-transforms.json
```

Example configuration:
```json
{
  "preprocess": [
    {
      "name": "fix-custom-auth",
      "description": "Fix custom authentication pattern",
      "pattern": "customAuth\\.(\\w+)",
      "replacement": "pm.globals.get('$1')",
      "flags": "g",
      "enabled": true
    }
  ],
  "postprocess": [
    {
      "name": "fix-custom-headers",
      "description": "Fix custom header access pattern",
      "pattern": "insomnia\\.customHeader\\((.*?)\\)",
      "replacement": "insomnia.request.getHeader($1)",
      "flags": "g",
      "enabled": true
    }
  ]
}
```

## Variable Name Transformation

Postman collections sometimes use variable names with dots (e.g., `api.base.url`, `auth.token.key`), but Insomnia works better with underscores. This tool automatically transforms these variable names during conversion:

### Environment Variables
```json
// Postman Environment
{
  "values": [
    {"key": "api.base.url", "value": "https://api.example.com"},
    {"key": "auth.token.bearer", "value": "eyJ0eXAi..."}
  ]
}

// Converted to Insomnia
{
  "data": {
    "api_base_url": "https://api.example.com",
    "auth_token_bearer": "eyJ0eXAi..."
  }
}
```

### Collection Variables
```json
// Postman Collection
{
  "variable": [
    {"key": "service.timeout.seconds", "value": "30"},
    {"key": "retry.max.attempts", "value": "3"}
  ]
}

// Converted Variables
{
  "service_timeout_seconds": "30",
  "retry_max_attempts": "3"
}
```

### What Gets Transformed
- ✅ **Environment variables**: `database.connection.string` → `database_connection_string`
- ✅ **Collection variables**: `api.rate.limit` → `api_rate_limit`
- ✅ **Multiple dots**: `config.auth.oauth.client.id` → `config_auth_oauth_client_id`
- ✅ **Preserves existing**: Variables without dots remain unchanged
- ✅ **Respects state**: Disabled variables are still filtered out correctly

## How This Tool Was Created

This CLI tool was built by extracting and adapting the core conversion logic from **Insomnia's open-source UI codebase**. The original conversion functions were designed for UI integration and database storage. This project:

1. **Extracted core logic** from Insomnia source files:
   - `postman-converter.ts` - Collection conversion logic
   - `insomnia-v5.ts` - Insomnia v5 format generation
   - `import-v5-parser.ts` - Schema validation and parsing
   - `postman-env.ts` - Environment file processing

2. **Removed UI dependencies** and database integration

3. **Added CLI interface** with Commander.js for user-friendly command-line usage

4. **Enhanced with Transform System** to solve script compatibility issues

5. **Added flexible folder structure options** to match different workflow preferences

6. **Maintained compatibility** with original Insomnia conversion logic

## Technical Details

### Architecture
```
├── cli.ts                 # CLI interface and argument parsing
├── converter.ts           # Main conversion orchestration
├── postman-converter.ts   # Core Postman parsing (adapted from Insomnia)
├── transform-engine.ts    # Extensible transform system
├── postman-env.ts         # Environment file conversion
└── types/                 # TypeScript definitions
```

### Dependencies
- **Commander.js** - CLI argument parsing and command structure
- **js-yaml** - YAML generation for Insomnia-compatible output
- **chalk** - Colored console output for better user experience
- **glob** - File pattern matching for batch operations

### Output Format
- **Collections**: `collection.insomnia.rest/5.0` YAML format
- **Environments**: `environment.insomnia.rest/5.0` YAML format
- **Schema compliance**: Generated files pass Insomnia v5 validation

## Limitations

1. **Simplified Authentication**: Some complex authentication flows are simplified but functional
2. **Script Compatibility**: Pre-request and post-response scripts are converted from `pm.*` to `insomnia.*` syntax with automatic compatibility fixes
3. **v5 Format Only**: Outputs Insomnia v5 format (not v4 or older)
4. **Node.js Required**: Requires Node.js runtime (not a standalone binary)
5. **YAML Output**: Primarily generates YAML (JSON option exists but not fully implemented)

## Future Changes

**Important**: In a future major version (v2.0.0), the `--use-collection-folder` behavior will become the default to better match how Insomnia UI performs conversions. This will be a breaking change, but the current behavior will remain available via a flag.

**Migration Path**: Start using `--use-collection-folder` now to prepare for the future default behavior.

## Contributing

This tool was built by adapting Insomnia's existing codebase. When contributing:

1. **Maintain compatibility** with original Insomnia conversion logic
2. **Follow TypeScript best practices** used in the Insomnia codebase
3. **Test with real Postman exports** to ensure compatibility
4. **Update schema compliance** if Insomnia v5 format changes
5. **Add transform rules** for new compatibility issues discovered

### Adding Transform Rules

To add new transform rules:

1. Edit `src/transform-engine.ts`
2. Add rules to `DEFAULT_PREPROCESS_RULES` or `DEFAULT_POSTPROCESS_RULES`
3. Test with collections that exhibit the issue
4. Update documentation

## Documentation

- **[Transform System Guide](docs/transform-system.md)** - Comprehensive guide to the transform system
- **[Troubleshooting](docs/troubleshooting.md)** - Common issues and solutions
- **[Configuration Reference](docs/configuration.md)** - Complete configuration options

## License

This project adapts open-source code from the Insomnia project. Please refer to the original Insomnia license terms.

## Related Projects

- [Insomnia](https://github.com/Kong/insomnia) - The original REST client and source of conversion logic
- [Postman](https://www.postman.com/) - API development platform and source format

---

**Built with ❤️ by adapting the excellent work of the Insomnia team**
