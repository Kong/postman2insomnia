# Response Examples Enhancement

## Overview

The Response Examples Enhancement preserves Postman response examples during conversion to Insomnia format. Since Insomnia doesn't have a direct equivalent to Postman's response examples feature, this enhancement appends them to request descriptions as structured markdown with JSON code blocks.

## Why This Feature?

**Problem**: Postman collections often contain response examples that demonstrate expected API behaviour, but these are lost during conversion because Insomnia has no equivalent field.

**Solution**: Automatically append response examples to request descriptions as formatted markdown, preserving all the valuable documentation for developers.

## Usage

### Basic Usage

Enable response examples preservation with the `--include-response-examples` flag:

```bash
postman2insomnia collection.json --include-response-examples
```

### Combined with Other Options

```bash
postman2insomnia collection.json \
  --include-response-examples \
  --output ./converted \
  --verbose \
  --postprocess
```

## What Gets Included

The enhancement automatically includes **all** response examples with:

✅ **Complete response data** - Status, code, headers, and body
✅ **Pretty-formatted JSON** - Easy to read with proper indentation
✅ **All response headers** - Full header information preserved
✅ **Content type detection** - Shows detected content types
✅ **Multiple examples** - Includes every response example from Postman

## Output Format

### Before (Original Postman Description)
```
This endpoint uploads and processes supporting documents with OCR capability.
```

### After (Enhanced Insomnia Description)
````markdown
This endpoint uploads and processes supporting documents with OCR capability.

## Response Examples

### Response Example 1: upload and OCR result

```json
{
  "name": "upload and OCR result",
  "status": "OK",
  "code": 200,
  "headers": {
    "Content-Type": "application/json",
    "X-Request-ID": "12345"
  },
  "body": {
    "id": "Lorem adipisicing aliqua",
    "borrowerCode": "nisi in enim ali",
    "status": "toBeValidated",
    "ocrResult": {
      "status": "AUTH_ERROR",
      "globalResult": "NONE"
    }
  },
  "contentType": "json"
}
```

### Response Example 2: Bad request

```json
{
  "name": "Bad request",
  "status": "Bad Request",
  "code": 400,
  "headers": {
    "Content-Type": "application/json"
  },
  "body": {
    "code": "enim ut pariatur nos",
    "shortlib": "eiusmod exercitation Lorem qui",
    "longlib": "nostrud et officia"
  },
  "contentType": "json"
}
```
````

## How It Works

### 1. **Preservation Process**
- Scans Postman requests for response examples
- Extracts response data: name, status, code, headers, body
- Formats as structured JSON in markdown code blocks
- Appends to existing request descriptions

### 2. **Smart Description Handling**
- **Existing descriptions**: Response examples are appended after existing content
- **Empty descriptions**: Only response examples are added
- **Markdown preservation**: Existing formatting is maintained
- **Multiple examples**: All examples are included in order

### 3. **Data Processing**
- **JSON parsing**: Response bodies are parsed and pretty-formatted when possible
- **Fallback handling**: Non-JSON bodies are included as strings
- **Header processing**: All response headers are preserved
- **Content type detection**: Uses Postman's preview language when available

## Configuration

### Simple On/Off Control

The feature uses a single boolean flag for simplicity:

- **Enabled**: `--include-response-examples` - Includes all examples with full formatting
- **Disabled**: Default behaviour - No response examples included

## Use Cases

### 📚 **API Documentation**
Perfect for teams that rely on response examples for API understanding and testing.

### 🔄 **Migration from Postman**
Ensures no valuable documentation is lost when moving to Insomnia.

### 👥 **Team Collaboration**
Preserves examples that help team members understand expected API responses.

### 🧪 **Testing Reference**
Provides quick reference for expected response structures during development, or when creating mocks
