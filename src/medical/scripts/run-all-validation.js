import 'dotenv/config';

/**
 * Run All Medical Vertical Validation Scripts
 * Note: Run each script individually for best results:
 * 
 * node src/medical/scripts/validate-schema.js
 * node src/medical/scripts/test-m-otto.js
 * node src/medical/scripts/test-hipaa-compliance.js
 * node src/medical/scripts/test-cross-vertical-learning.js
 * node src/medical/scripts/benchmark-performance.js
 * node src/medical/scripts/simulate-week1-deployment.js
 * 
 * Or use: npm run validate-medical (if configured in package.json)
 */

async function runAllValidation() {
  console.log('═══════════════════════════════════════');
  console.log('MEDICAL VERTICAL VALIDATION SUITE');
  console.log('═══════════════════════════════════════\n');

  console.log('To run all validations, execute each script individually:\n');
  
  const scripts = [
    'node src/medical/scripts/validate-schema.js',
    'node src/medical/scripts/test-m-otto.js',
    'node src/medical/scripts/test-hipaa-compliance.js',
    'node src/medical/scripts/test-cross-vertical-learning.js',
    'node src/medical/scripts/benchmark-performance.js',
    'node src/medical/scripts/simulate-week1-deployment.js'
  ];

  scripts.forEach((cmd, i) => {
    console.log(`${i + 1}. ${cmd}`);
  });

  console.log('\nOr create a simple shell script to run all:\n');
  console.log('#!/bin/bash');
  scripts.forEach(cmd => {
    console.log(`${cmd} || exit 1`);
  });
  
  console.log('\n═══════════════════════════════════════\n');

  return true;
}

// Run info
runAllValidation();












