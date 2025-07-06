import { TransformEngine } from '../../src/transform-engine';
import { TestDataManager } from '../helpers/test-utils';
import { convertPostmanToInsomnia, ConversionOptions, ConversionResult } from '../../src/converter';
import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import * as yaml from 'js-yaml';

describe('Transform Engine Isolated Testing', () => {
  it('should verify transform engine works on simple string', () => {
    const engine = new TransformEngine();
    const input = 'postman.getGlobalVariable("test");';
    const output = engine.preprocess(input);

    console.log('🔍 STEP 1 - Transform Engine Test:');
    console.log('Input:', input);
    console.log('Output:', output);
    console.log('Contains pm.globals.get:', output.includes('pm.globals.get'));
    console.log('Contains postman.getGlobalVariable:', output.includes('postman.getGlobalVariable'));

    expect(output).toContain('pm.globals.get');
    expect(output).not.toContain('postman.getGlobalVariable');
  });

  it('should verify transform engine default rules', () => {
    const engine = new TransformEngine();
    const config = JSON.parse(engine.exportConfig());

    console.log('🔍 STEP 2 - Default Rules Check:');
    console.log('Preprocess rules count:', config.preprocess.length);

    const globalRule = config.preprocess.find((rule: any) =>
      rule.pattern.includes('getGlobalVariable')
    );

    console.log('Found getGlobalVariable rule:', !!globalRule);
    if (globalRule) {
      console.log('Rule details:', {
        name: globalRule.name,
        pattern: globalRule.pattern,
        replacement: globalRule.replacement,
        enabled: globalRule.enabled
      });
    } else {
      console.log('Available preprocess rules:');
      config.preprocess.forEach((rule: any) => {
        console.log(`- ${rule.name}: ${rule.pattern}`);
      });
    }

    expect(globalRule).toBeDefined();
    expect(globalRule.enabled).toBe(true);
  });
});

describe('Full Pipeline Debugging', () => {
  it('should apply both preprocessing and postprocessing in full pipeline (with debugging)', async () => {
    console.log('🔍 STEP 3 - Full Pipeline Test with Debugging');

    const legacyCollection = {
      info: {
        name: 'Legacy Collection with Scripts',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
        _postman_id: 'legacy-test-collection'
      },
      item: [
        {
          name: 'Request with Legacy Script',
          request: {
            method: 'GET',
            url: 'https://api.example.com/data'
          },
          event: [
            {
              listen: 'prerequest',
              script: {
                exec: [
                  '// Legacy syntax that needs preprocessing',
                  'postman.getGlobalVariable("timestamp");'
                ]
              }
            }
          ]
        }
      ]
    };

    const tempDir = TestDataManager.createTempDir();
    const inputFile = path.join(tempDir, 'legacy-collection.json');

    try {
      // Write the collection
      fs.writeFileSync(inputFile, JSON.stringify(legacyCollection, null, 2));

      const rawContent = fs.readFileSync(inputFile, 'utf8');
      console.log('📄 Raw file content around script:');
      const scriptStart = rawContent.indexOf('postman.getGlobalVariable');
      if (scriptStart !== -1) {
        console.log(rawContent.substring(scriptStart - 50, scriptStart + 100));
      } else {
        console.log('❌ postman.getGlobalVariable not found in raw file!');
        console.log('File contains:', rawContent.substring(0, 500));
      }

      const transformEngine = new TransformEngine();
      const preprocessedContent = transformEngine.preprocess(rawContent);
      console.log('🔄 After preprocessing:');
      const pmGlobalsStart = preprocessedContent.indexOf('pm.globals.get');
      const postmanStart = preprocessedContent.indexOf('postman.getGlobalVariable');

      if (pmGlobalsStart !== -1) {
        console.log('✅ Found pm.globals.get at position:', pmGlobalsStart);
        console.log(preprocessedContent.substring(pmGlobalsStart - 30, pmGlobalsStart + 50));
      } else {
        console.log('❌ pm.globals.get NOT found after preprocessing');
      }

      if (postmanStart !== -1) {
        console.log('⚠️  postman.getGlobalVariable still exists at position:', postmanStart);
      } else {
        console.log('✅ postman.getGlobalVariable removed by preprocessing');
      }

      console.log('🚀 Running full conversion...');
      const result = await convertPostmanToInsomnia([inputFile], {
        outputDir: tempDir,
        format: 'yaml',
        merge: false,
        verbose: true,
        preprocess: true,
        postprocess: true
      });

      console.log('📊 Conversion result:', {
        successful: result.successful,
        failed: result.failed,
        outputs: result.outputs.length
      });

      if (result.successful > 0) {
        const outputContent = fs.readFileSync(result.outputs[0], 'utf8');
        const parsedOutput = yaml.load(outputContent) as any;
        const convertedRequest = parsedOutput.collection.find((item: any) =>
          item.name === 'Request with Legacy Script'
        );

        if (convertedRequest && convertedRequest.scripts) {
          const preRequestScript = convertedRequest.scripts.preRequest;
          console.log('📝 Final preRequestScript:');
          console.log(`"${preRequestScript}"`);

          console.log('🔍 Script analysis:');
          console.log('- Contains insomnia.globals.get:', preRequestScript.includes('insomnia.globals.get'));
          console.log('- Contains pm.globals.get:', preRequestScript.includes('pm.globals.get'));
          console.log('- Contains postman.getGlobalVariable:', preRequestScript.includes('postman.getGlobalVariable'));

        } else {
          console.log('❌ No scripts found in converted request');
          console.log('Converted request structure:', JSON.stringify(convertedRequest, null, 2));
        }
      }

    } finally {
      TestDataManager.cleanupTempDir(tempDir);
    }
  });
});

describe('Pattern Verification', () => {
  it('should verify the exact pattern used in the failing test', () => {
    console.log('🔍 STEP 4 - Pattern Verification');

    const jsonString = '"postman.getGlobalVariable(\\"timestamp\\");"';
    const plainString = 'postman.getGlobalVariable("timestamp");';

    const pattern = /postman\.getGlobalVariable\((.*?)\)/g;
    const replacement = 'pm.globals.get($1)';

    console.log('Testing JSON string:', jsonString);
    console.log('Pattern matches JSON:', pattern.test(jsonString));
    console.log('JSON result:', jsonString.replace(new RegExp(pattern.source, pattern.flags), replacement));

    console.log('Testing plain string:', plainString);
    pattern.lastIndex = 0; // Reset regex state
    console.log('Pattern matches plain:', pattern.test(plainString));
    pattern.lastIndex = 0; // Reset again
    console.log('Plain result:', plainString.replace(pattern, replacement));

    const engine = new TransformEngine();
    const engineResult = engine.preprocess(jsonString);
    console.log('Engine result on JSON string:', engineResult);

    expect(engineResult).toContain('pm.globals.get');
  });
});
