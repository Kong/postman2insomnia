# Troubleshooting Guide

This guide helps you solve common issues when converting Postman collections to Insomnia format, especially script-related problems that occur after conversion.

## 🚨 Common Script Errors in Insomnia

### Error: `insomnia.response.headers.get(...).includes is not a function`

**Problem**: Your converted scripts fail in Insomnia with this error when trying to use string methods on headers.

**Root Cause**: Postman and Insomnia return different data types from `headers.get()`:
- **Postman**: Returns the header value as a string
- **Insomnia**: Returns an object with properties like `{id, name, key, value}`

**Example of Failing Code**:
```javascript
// This works in Postman but fails in Insomnia:
if (insomnia.response.headers.get("Content-Type").includes("application/json")) {
  // TypeError: insomnia.response.headers.get(...).includes is not a function
}
```

**Solutions**:

#### Option 1: Use Postprocessing (Recommended)
```bash
# Automatically fix header access issues
postman2insomnia collection.json --postprocess
```

#### Option 2: Manual Fix
```javascript
// Change this (fails):
if (insomnia.response.headers.get("Content-Type").includes("application/json")) {

// To this (works):
if (insomnia.response.headers.get("Content-Type").value.includes("application/json")) {
```

#### Option 3: Custom Transform Rule
Add this rule to your config file:
```json
{
  "postprocess": [
    {
      "name": "fix-header-includes",
      "description": "Fix header.includes() calls",
      "pattern": "insomnia\\.response\\.headers\\.get\\(([^)]+)\\)\\.includes\\(",
      "replacement": "insomnia.response.headers.get($1).value.includes(",
      "flags": "g",
      "enabled": true
    }
  ]
}
```

### Error: `insomnia.response.headers.get(...).toLowerCase is not a function`

**Problem**: String methods like `.toLowerCase()`, `.toUpperCase()`, `.trim()` fail on header objects.

**Solution**: Use postprocessing or add `.value` manually:

```bash
# Automatic fix:
postman2insomnia collection.json --postprocess
```

```javascript
// Manual fix - change this:
const contentType = insomnia.response.headers.get("Content-Type").toLowerCase();

// To this:
const contentType = insomnia.response.headers.get("Content-Type").value.toLowerCase();
```

### Error: Header Comparison Always False

**Problem**: Header comparisons don't work as expected:

```javascript
// This always returns false:
if (insomnia.response.headers.get("Status") === "success") {
  // Never executes
}
```

**Root Cause**: Comparing a header object to a string instead of the header value.

**Solution**:
```javascript
// Fix by accessing .value property:
if (insomnia.response.headers.get("Status").value === "success") {
  // Now works correctly
}
```

**Automatic Fix**:
```bash
postman2insomnia collection.json --postprocess
```

## 🔧 Legacy Postman Syntax Issues

### Error: `pm.responseHeaders is undefined`

**Problem**: Old Postman collections use deprecated syntax that doesn't convert properly.

**Failing Code**:
```javascript
// Deprecated syntax:
if (pm.responseHeaders["Content-Type"]) {
  console.log(pm.responseHeaders["Content-Type"]);
}
```

**Solution**: Use preprocessing to fix deprecated syntax:

```bash
# Automatically fix deprecated syntax before conversion
postman2insomnia collection.json --preprocess
```

**Manual Fix**:
```javascript
// Change deprecated syntax:
pm.responseHeaders["Content-Type"]

// To modern syntax:
pm.response.headers.get("Content-Type")
```

### Error: `postman.setEnvironmentVariable is not a function`

**Problem**: Very old collections use `postman.setEnvironmentVariable()` instead of modern syntax.

**Solution**:
```bash
# Use preprocessing to fix
postman2insomnia collection.json --preprocess
```

**Manual Fix**:
```javascript
// Change this:
postman.setEnvironmentVariable("token", jsonData.token);

// To this:
pm.environment.set("token", jsonData.token);
```

### Error: `tests is not defined`

**Problem**: Ancient Postman syntax using `tests[]` array.

**Failing Code**:
```javascript
// Very old syntax:
tests["Status code is 200"] = pm.response.code === 200;
```

**Solution**:
```bash
postman2insomnia collection.json --preprocess
```

**Manual Fix**:
```javascript
// Change this:
tests["Status code is 200"] = pm.response.code === 200;

// To this:
pm.test("Status code is 200", function() {
  pm.expect(pm.response.code === 200).to.be.true;
});
```

## 📝 Configuration Issues

### Issue: Transform Config Not Found

**Error**: `Failed to load config from [path], using defaults`

**Causes**:
1. Config file doesn't exist
2. Wrong file path
3. Invalid JSON syntax

**Solutions**:

```bash
# Generate a valid config file:
postman2insomnia --generate-config ./my-config.json

# Validate existing config:
postman2insomnia config --validate ./my-config.json

# Use absolute path:
postman2insomnia collection.json --config-file /full/path/to/config.json
```

### Issue: Transforms Not Applied

**Problem**: Conversions complete but transforms don't seem to work.

**Debugging Steps**:

1. **Enable verbose mode**:
```bash
postman2insomnia collection.json --preprocess --postprocess --verbose
```

2. **Check if transforms are enabled**:
```bash
# Verify you're using transform flags:
postman2insomnia collection.json --preprocess --postprocess
```

3. **Validate your config**:
```json
{
  "postprocess": [
    {
      "name": "test-rule",
      "enabled": true,  // Make sure this is true
      "pattern": "your-pattern",
      "replacement": "your-replacement"
    }
  ]
}
```

4. **Test with simple pattern**:
```json
{
  "postprocess": [
    {
      "name": "simple-test",
      "pattern": "insomnia",
      "replacement": "TRANSFORMED_insomnia",
      "flags": "g",
      "enabled": true
    }
  ]
}
```

### Issue: Invalid Regex Pattern

**Error**: `Failed to apply transform rule "rule-name"`

**Problem**: Your regex pattern is invalid.

**Common Mistakes**:
```json
// ❌ Wrong: Unescaped special characters
{
  "pattern": "pm.response.headers.get(.*)",
  "replacement": "fixed"
}

// ✅ Correct: Properly escaped
{
  "pattern": "pm\\.response\\.headers\\.get\\(.*\\)",
  "replacement": "fixed"
}
```

**Debugging**:
1. Test your regex at [regex101.com](https://regex101.com)
2. Use double backslashes in JSON: `\\.` for `.`
3. Escape parentheses: `\\(` and `\\)`

## 🔍 Conversion Issues

### Issue: No Files Converted

**Error**: `Successfully converted 0 collection(s)`

**Causes**:
1. Wrong file paths or glob patterns
2. Files aren't valid Postman collections
3. Unsupported Postman version

**Solutions**:

```bash
# Check file paths:
ls -la *.json

# Verify file format:
cat collection.json | head -20

# Try absolute paths:
postman2insomnia /full/path/to/collection.json

# Check Postman schema version:
grep -i "schema" collection.json
```

**Supported Schemas**:
- ✅ `https://schema.getpostman.com/json/collection/v2.0.0/collection.json`
- ✅ `https://schema.getpostman.com/json/collection/v2.1.0/collection.json`
- ❌ v1.0 collections (not supported)

### Issue: Conversion Fails with Transform Errors

**Error**: Conversion stops with transform-related errors.

**Quick Fix**:
```bash
# Skip transforms if they're causing issues:
postman2insomnia collection.json
# (no --preprocess or --postprocess flags)
```

**Debug Transforms**:
```bash

# Test preprocessing only:
postman2insomnia collection.json --preprocess --verbose

# Test postprocessing only:
postman2insomnia collection.json --postprocess --verbose
```

## 🎯 Environment-Specific Issues

### Issue: Environment Variables Not Converted

**Problem**: Postman environment files don't convert properly.

**Solution**:
```bash
# Make sure file is recognized as environment:
grep "_postman_variable_scope" environment.json

# Should show: "environment" or "globals"
```

**Valid Environment Format**:
```json
{
  "name": "My Environment",
  "_postman_variable_scope": "environment",
  "values": [
    {
      "key": "baseUrl",
      "value": "https://api.example.com",
      "enabled": true
    }
  ]
}
```

### Issue: Disabled Variables Included

**Problem**: Disabled environment variables appear in converted output.

**Expected Behavior**: Disabled variables should be filtered out automatically.

**Verification**:
```json
// This should NOT appear in output:
{
  "key": "disabledVar",
  "value": "should-not-appear",
  "enabled": false
}
```

**If disabled variables appear**, this is a bug - please report it.

## 🆘 Getting More Help

### Enable Debug Mode

```bash
# Maximum verbosity:
postman2insomnia collection.json --preprocess --postprocess --verbose

# Check what files are found:
postman2insomnia *.json --verbose
```

### Create Minimal Test Case

1. **Isolate the problem** in a small collection
2. **Remove sensitive data** (URLs, tokens, etc.)
3. **Test with default transforms** first
4. **Share the specific error message**

### Common Debug Commands

```bash
# Test basic conversion (no transforms):
postman2insomnia collection.json

# Test with default transforms:
postman2insomnia collection.json --preprocess --postprocess

# Generate fresh config (modify if required):
postman2insomnia --generate-config ./debug-config.json

# Validate your config:
postman2insomnia config --validate ./your-config.json
```

### Report Issues

When reporting issues, include:

1. **Command used**: `postman2insomnia collection.json --preprocess --postprocess`
2. **Error message**: Full error output
3. **Collection snippet**: Minimal example that reproduces the issue
4. **Config file**: If using custom transforms
5. **Expected vs actual**: What you expected vs what happened

---

## 📚 Quick Reference

### Most Common Solutions

| Problem | Solution |
|---------|----------|
| Scripts work in Postman but fail in Insomnia | Use `--postprocess` |
| Very old collection with weird syntax | Use `--preprocess` |
| Need both fixes | Use `--preprocess --postprocess` |

### Emergency Commands

```bash
# Just convert without any transforms:
postman2insomnia collection.json

# Use all transforms with verbose output:
postman2insomnia collection.json --preprocess --postprocess --verbose

# Generate a working config file:
postman2insomnia --generate-config ./working-config.json
```

---

**Related Documentation:**
- [Transform System Guide](transform-system.md) - Complete transform documentation
- [Configuration Reference](configuration.md) - All config options
