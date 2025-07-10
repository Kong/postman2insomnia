# Postman to Insomnia CLI Converter

A powerful command-line tool that converts Postman collections and environments to Insomnia v5 YAML format with advanced script compatibility features and flexible folder organization. This tool was built by extracting and adapting the core conversion logic from Insomnia's UI codebase to create a standalone CLI utility.

## 🚀 Features

### Core Conversion
- **Converts Postman Collections** (v2.0 and v2.1) to Insomnia v5 YAML format
- **Converts Postman Environments** (including globals) to Insomnia v5 YAML format
- **Batch processing** of multiple files with glob pattern support
- **Merge multiple collections** into a single output file
- **Preserves folder structure** and request organization
- **Handles authentication** methods (Basic, Bearer, OAuth, API Key, etc.)
- **Maintains variables** and environment data
- **Filters disabled variables** from environments
- **Auto-detects file types** (collection vs environment)

### 📁 Folder Structure Options (New!)
- **Flexible folder organization** - Choose between two folder structures:
  - **Original structure** (default): `Collection Name > Folders/Requests`
  - **Nested structure**: `Collection Name > Collection Name > Folders/Requests`
- **Insomnia UI compatibility** - Nested structure matches how Insomnia UI performs conversions
- **Backward compatibility** - Default behavior preserved for existing workflows
- **Future-ready** - Nested structure will become default in future major version

### 🔧 Transform System
- **Preprocessing transforms** - Fix deprecated Postman syntax before conversion
- **Postprocessing transforms** - Fix Insomnia API differences after conversion
- **Script compatibility engine** - Automatically resolves API differences between Postman and Insomnia
- **Custom transform rules** - Define your own conversion patterns via config files
- **Built-in compatibility fixes** for common script issues

### 🛠️ Script Processing
- **Pre-request and post-response scripts** conversion from `pm.*` to `insomnia.*` syntax
- **Automatic header access fixes** - Resolves `headers.get(...).includes is not a function` errors
- **Legacy syntax updates** - Converts old `postman.*` and `tests[]` syntax to modern equivalents
- **API method compatibility** - Fixes method call differences between platforms

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

### 📁 Folder Structure Options

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

### 🆕 Transform Usage

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

# Merge multiple collections with nested structure
postman2insomnia col1.json col2.json env.json -m --use-collection-folder

# Batch convert with nested structure and custom transforms
postman2insomnia exports/*.json --use-collection-folder --preprocess --postprocess -o ./output -v

# Use custom config for enterprise collections with nested structure
postman2insomnia enterprise/*.json --use-collection-folder --config-file ./enterprise-transforms.json -o ./converted

# Use experimental rules
postman2insomnia collection.json --preprocess --postprocess --experimental
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
| `--merge` | `-m` | Merge all collections into a single file | `false` |
| `--verbose` | `-v` | Verbose output | `false` |
| `--use-collection-folder` | | Add collection name as containing folder | `false`* |
| `--experimental` | | Use the experimental pre and post processing rules as well as the defaults | `false`* |
| `--preprocess` | | Apply preprocessing transforms | `false` |
| `--postprocess` | | Apply postprocessing transforms | `false` |
| `--config-file <path>` | | Custom transform configuration file | |
| `--generate-config <path>` | | Generate sample transform configuration | |
| `--help` | `-h` | Show help | |
| `--version` | `-V` | Show version | |

*_**Note**: `--use-collection-folder` currently defaults to `false` for backward compatibility. In a future major version, this will become the default behavior to better match how Insomnia UI performs conversions._

## 🔍 When to Use Options

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

## 📋 Examples

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

# Merge into single file with nested structure
postman2insomnia postman-exports/*.json \
  --use-collection-folder \
  --preprocess --postprocess \
  --merge \
  -o ./merged
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

## 🏗️ Folder Structure Comparison

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

## 🐛 Common Issues & Solutions

### Script Compatibility Issues

**Problem**: Converted scripts fail with method errors
```javascript
// ❌ This fails in Insomnia
if (insomnia.response.headers.get('Content-Type').includes('json')) {
    // Error: headers.get(...).includes is not a function
}
```

**Solution**: Use `--postprocess` flag
```bash
postman2insomnia collection.json --postprocess
```
```javascript
// ✅ This works after postprocessing
if (insomnia.response.headers.get('Content-Type').value.includes('json')) {
    // Fixed: .value property added automatically
}
```

### Legacy Postman Syntax

**Problem**: Old collections use deprecated methods
```javascript
// ❌ Deprecated syntax
var token = postman.getEnvironmentVariable('auth_token');
tests['Status is 200'] = responseCode.code === 200;
```

**Solution**: Use `--preprocess` flag
```bash
postman2insomnia collection.json --preprocess
```
```javascript
// ✅ Updated to modern syntax
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

## 📖 Advanced Transform Configuration

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

### CI/CD Integration

```yaml
# GitHub Actions example
name: Convert Postman Collections
jobs:
  convert:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install converter
        run: |
          git clone <this-repo-url>
          cd postman-to-insomnia-cli
          npm install && npm run build
          npm install -g .

      - name: Convert collections
        run: |
          postman2insomnia postman-exports/*.json \
            --use-collection-folder \
            --preprocess --postprocess \
            --output ./insomnia-collections \
            --verbose

      - name: Upload converted files
        uses: actions/upload-artifact@v3
        with:
          name: insomnia-collections
          path: ./insomnia-collections/
```

## 🏗️ How This Tool Was Created

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

## 🔧 Technical Details

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

## ⚠️ Limitations

1. **Simplified Authentication**: Some complex authentication flows are simplified but functional
2. **Script Compatibility**: Pre-request and post-response scripts are converted from `pm.*` to `insomnia.*` syntax with automatic compatibility fixes
3. **v5 Format Only**: Outputs Insomnia v5 format (not v4 or older)
4. **Node.js Required**: Requires Node.js runtime (not a standalone binary)
5. **YAML Output**: Primarily generates YAML (JSON option exists but not fully implemented)

## 🔮 Future Changes

**Important**: In a future major version (v2.0.0), the `--use-collection-folder` behavior will become the default to better match how Insomnia UI performs conversions. This will be a breaking change, but the current behavior will remain available via a flag.

**Migration Path**: Start using `--use-collection-folder` now to prepare for the future default behavior.

## 🤝 Contributing

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

## 📚 Documentation

- **[Transform System Guide](docs/transform-system.md)** - Comprehensive guide to the transform system
- **[Troubleshooting](docs/troubleshooting.md)** - Common issues and solutions
- **[Configuration Reference](docs/configuration.md)** - Complete configuration options

## 📄 License

This project adapts open-source code from the Insomnia project. Please refer to the original Insomnia license terms.

## 🔗 Related Projects

- [Insomnia](https://github.com/Kong/insomnia) - The original REST client and source of conversion logic
- [Postman](https://www.postman.com/) - API development platform and source format

---

**Built with ❤️ by adapting the excellent work of the Insomnia team**
