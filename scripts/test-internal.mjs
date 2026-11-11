import { run } from 'node:test';
import { readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { stripVTControlCharacters } from 'node:util';

const root = fileURLToPath(new URL('../', import.meta.url));

// Znajdź pliki → uruchom testy → sprawdź kod → pokaż podsumowanie w terminalu.
const scope = readScope(process.argv.slice(2));
const testFiles = await findTestFiles(scope);

console.log(`Testy Chronomap — zakres: ${scope}\n`);

const testRun = await runTestFiles(testFiles);
const checks = scope === 'all' ? runCodeChecks() : [];
const hasFailure = testRun.hasFailure || checks.some(check => check.status === 'FAIL');

console.log('\nPodsumowanie:');
console.log(
  `Scenariusze: ${testRun.total}; PASS: ${testRun.passed}; FAIL: ${testRun.failed}; pominięte: ${testRun.skipped}.`,
);
console.log(`Wynik całego uruchomienia: ${hasFailure ? 'FAIL' : 'PASS'}.`);

process.exitCode = hasFailure ? 1 : 0;

// WYBÓR ZAKRESU I PLIKÓW

function readScope(argumentsList) {
  const allowedArguments = ['--unit', '--integration'];
  const hasUnknownArgument = argumentsList.some(argument => (
    !allowedArguments.includes(argument)
  ));
  const hasBothScopes = argumentsList.includes('--unit')
    && argumentsList.includes('--integration');

  if (hasUnknownArgument || hasBothScopes) {
    throw new Error('Użycie: node scripts/test-internal.mjs [--unit | --integration]');
  }

  if (argumentsList.includes('--unit')) return 'unit';
  if (argumentsList.includes('--integration')) return 'integration';
  return 'all';
}

async function findTestFiles(selectedScope) {
  const groups = selectedScope === 'all' ? ['unit', 'integration'] : [selectedScope];
  const testFiles = [];

  for (const group of groups) {
    const directory = resolve(root, 'tests', group);
    const fileNames = await readdir(directory);
    const testNames = fileNames.filter(name => name.endsWith('.test.mjs')).sort();

    for (const name of testNames) {
      testFiles.push(resolve(directory, name));
    }
  }

  return testFiles;
}

// WYKONANIE TESTÓW

async function runTestFiles(testFiles) {
  const summary = {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    hasFailure: false,
  };

  // Pliki wykonują się kolejno, z limitem 120 sekund na plik.
  const events = run({ files: testFiles, concurrency: 1, timeout: 120000 });

  for await (const event of events) {
    if (event.type === 'test:stderr') {
      process.stderr.write(event.data.message);
    }

    const isFinishedTest = event.type === 'test:pass' || event.type === 'test:fail';
    if (!isFinishedTest) continue;

    const { name, details, skip, todo } = event.data;
    if (event.type === 'test:fail') {
      summary.hasFailure = true;
    }

    // Liczymy scenariusze z ID, np. MAP-01 lub PRG-06.
    // Błędy uruchomienia plików też pokazujemy, ale nie liczymy ich jako scenariuszy.
    if (!/^[A-Z]+-\d+ \|/.test(name)) {
      if (event.type === 'test:fail') {
        const message = details.error ? errorMessage(details.error) : 'Nieznany błąd';
        console.error(`Błąd wykonania: ${name}: ${message}`);
      }
      continue;
    }

    let status;
    if (skip) status = 'SKIP';
    else if (todo) status = 'TODO';
    else if (event.type === 'test:pass') status = 'PASS';
    else status = 'FAIL';

    summary.total += 1;
    if (status === 'PASS') summary.passed += 1;
    else if (status === 'FAIL') summary.failed += 1;
    else summary.skipped += 1;

    const message = details.error ? `: ${errorMessage(details.error)}` : '';
    console.log(`${status} ${name}${message}`);
  }

  if (summary.total === 0) {
    summary.hasFailure = true;
    console.error('Nie uruchomiono scenariuszy.');
  }

  return summary;
}

function errorMessage(error) {
  const causeMessage = error.cause?.message;
  if (causeMessage && causeMessage !== error.message) {
    return `${error.message}: ${causeMessage}`;
  }

  return error.message;
}

// DODATKOWE KONTROLE KODU

function runCodeChecks() {
  const commands = [
    {
      name: 'lint',
      arguments: ['node_modules/eslint/bin/eslint.js', '.'],
    },
    {
      name: 'build',
      // Sprawdzamy kod źródłowy bez odczytywania prywatnego pliku .env.
      arguments: [
        '--input-type=module',
        '--eval',
        "const { build } = await import('vite'); await build({ envFile: false });",
      ],
    },
  ];
  const checks = [];

  for (const command of commands) {
    const result = spawnSync(process.execPath, command.arguments, {
      cwd: root,
      encoding: 'utf8',
      timeout: 120000,
    });
    const status = result.status === 0 ? 'PASS' : 'FAIL';

    console.log(`${status} ${command.name}`);

    if (status === 'FAIL') {
      const output = [
        result.stdout || '',
        result.stderr || '',
        result.error?.message || '',
      ].join('');
      console.error(stripVTControlCharacters(output));
    }

    checks.push({ name: command.name, status });
  }

  return checks;
}
