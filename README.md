# Postman to Insomnia CLI Converter

A command-line tool that converts Postman collections and environments to Insomnia v5 YAML format. This tool was built by extracting and adapting the core conversion logic from Insomnia's UI codebase to create a standalone CLI utility.

## Features

- **Converts Postman Collections** (v2.0 and v2.1) to Insomnia v5 YAML format
- **Converts Postman Environments** (including globals) to Insomnia v5 YAML format
- **Batch processing** of multiple files
- **Merge multiple collections** into a single output
- **Preserves folder structure** and request organization
- **Handles authentication** methods (Basic, Bearer, OAuth, API Key, etc.)
- **Processes scripts** (pre-request and post-response)
- **Maintains variables** and environment data
- **Filters disabled variables** from environments
- **Auto-detects file types** (collection vs environment)

## Installation

### Global Installation (Recommended)

```bash
# Clone or download this repository
cd postman-to-insomnia-cli

# Install dependencies
npm install

# Build the project
npm run build

# Install globally
npm install -g .
```

After global installation, you can use `postman2insomnia` from anywhere:

```bash
postman2insomnia --version
postman2insomnia --help
```

### Local Development

```bash
# Clone the repository
git clone <repository-url>
cd postman-to-insomnia-cli

# Install dependencies
npm install

# Build the project
npm run build

# Run locally
node dist/cli.js <options>
```

## 🔧 Usage

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

### Advanced Options

```bash
# Merge multiple collections into one file
postman2insomnia col1.json col2.json env.json -m

# Custom output directory with verbose logging
postman2insomnia exports/*.json -o ./insomnia-imports -v

# Batch convert all Postman exports
postman2insomnia *.json -o ./output -v
```

### Command Line Options

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--output <dir>` | `-o` | Output directory | `./output` |
| `--merge` | `-m` | Merge all collections into a single file | `false` |
| `--verbose` | `-v` | Verbose output | `false` |
| `--help` | `-h` | Show help | |
| `--version` | `-V` | Show version | |

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

### Convert a Collection

```bash
# Input: my-api.json (Postman collection)
postman2insomnia my-api.json

# Output: ./output/my-api.insomnia.yaml
```

### Convert Environments

```bash
# Input: dev-env.json, prod-env.json (Postman environments)
postman2insomnia dev-env.json prod-env.json -o ./envs

# Output:
# ./envs/dev-env.insomnia.yaml
# ./envs/prod-env.insomnia.yaml
```

### Batch Conversion with Merging

```bash
# Convert all Postman exports and merge into one file
postman2insomnia postman-exports/*.json -m -o ./merged

# Output: ./merged/merged-collection.insomnia.yaml
```

## 🏗️ How This Tool Was Created

This CLI tool was built by extracting and adapting the core conversion logic from **Insomnia's open-source UI codebase**. The original code handles Postman imports within the Insomnia desktop application.

### Source Material

The conversion logic was adapted from these Insomnia source files:
- **`postman-converter.ts`** - Core Postman collection parsing and conversion
- **`insomnia-v5.ts`** - Insomnia v5 format export logic
- **`import-v5-parser.ts`** - Zod schema validation for v5 format
- **`postman-env.ts`** - Postman environment conversion logic

### Key Adaptations Made

#### 1. **Removed UI Dependencies**
- Extracted constants (`CONTENT_TYPE_*`) from UI modules
- Replaced UI-specific faker functions with simplified versions
- Removed database and UI state management dependencies

#### 2. **Added CLI Interface**
- Built command-line interface using Commander.js
- Added file I/O operations for batch processing
- Implemented glob pattern support for multiple files

#### 3. **Enhanced File Type Detection**
```typescript
// Auto-detect Postman collections vs environments
function isPostmanEnvironment(parsed: any): boolean {
  return parsed._postman_variable_scope && Array.isArray(parsed.values);
}

function isPostmanCollection(parsed: any): boolean {
  return parsed.info && parsed.info.schema && Array.isArray(parsed.item);
}
```

#### 4. **Strict Insomnia v5 Schema Compliance**
- Used exact Zod schema definitions from Insomnia source
- Added discriminated union properties to satisfy validation:
  ```typescript
  // For Request objects
  children: undefined

  // For RequestGroup objects
  method: undefined,
  url: undefined,
  parameters: undefined,
  pathParameters: undefined
  ```

#### 5. **YAML Output Generation**
- Added `js-yaml` integration for human-readable YAML output
- Ensured compatibility with Insomnia's v5 import system

#### 6. **Authentication Simplification**
- Simplified complex authentication methods while preserving structure
- Maintained compatibility with Insomnia's authentication system

## 🔍 Technical Details

### Dependencies
- **Commander.js** - CLI argument parsing
- **js-yaml** - YAML output generation
- **chalk** - Colored console output
- **glob** - File pattern matching

### TypeScript Configuration
- Strict typing enabled
- ES2020 target for modern Node.js compatibility
- CommonJS modules for CLI distribution

### Output Structure
Generated files follow the exact **Insomnia v5 specification**:
- Collections: `collection.insomnia.rest/5.0`
- Environments: `environment.insomnia.rest/5.0`
- Proper meta objects with timestamps and IDs
- Valid Zod schema compliance for import validation

## Known Limitations

1. **Simplified Authentication**: Some complex authentication flows are simplified but functional
2. **Script Compatibility**: Pre-request and post-response scripts are converted from `pm.*` to `insomnia.*` syntax
3. **v5 Format Only**: Outputs Insomnia v5 format (not v4 or older)
4. **Node.js Required**: Requires Node.js runtime (not a standalone binary)

## Contributing

This tool was built by adapting Insomnia's existing codebase. When contributing:

1. **Maintain compatibility** with original Insomnia conversion logic
2. **Follow TypeScript best practices** used in the Insomnia codebase
3. **Test with real Postman exports** to ensure compatibility
4. **Update schema compliance** if Insomnia v5 format changes

## License

This project adapts open-source code from the Insomnia project. Please refer to the original Insomnia license terms.

## 🔗 Related Projects

- [Insomnia](https://github.com/Kong/insomnia) - The original REST client and source of conversion logic
- [Postman](https://www.postman.com/) - API development platform and source format

---

**Built with ❤️ by adapting the excellent work of the Insomnia team**
