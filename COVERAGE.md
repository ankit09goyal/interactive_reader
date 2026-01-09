# Code Coverage Guide

This project uses [Vitest](https://vitest.dev/) with the `@vitest/coverage-v8` provider for code coverage reporting.

## Quick Start

### Run Tests with Coverage

```bash
npm run test:coverage
```

### Watch Mode with Coverage

```bash
npm run test:coverage:watch
```

### Generate and View Coverage Report

```bash
npm run coverage:report
npm run coverage:open  # Opens HTML report in browser (macOS)
```

## Coverage Scripts

- `npm run test:coverage` - Run tests once with coverage report
- `npm run test:coverage:watch` - Run tests in watch mode with coverage
- `npm run test:coverage:ui` - Run tests with UI and coverage
- `npm run coverage` - Alias for `test:coverage`
- `npm run coverage:watch` - Alias for `test:coverage:watch`
- `npm run coverage:report` - Generate coverage report with summary
- `npm run coverage:check` - Run coverage with verbose reporter
- `npm run coverage:open` - Open HTML coverage report in browser

## Coverage Reports

Coverage reports are generated in the `./coverage/` directory:

- **HTML Report**: `coverage/index.html` - Interactive HTML report (best for detailed analysis)
- **JSON Report**: `coverage/coverage-final.json` - Machine-readable format
- **LCOV Report**: `coverage/lcov.info` - For CI/CD integration (e.g., Codecov, Coveralls)
- **Text Summary**: Displayed in terminal after running coverage

## Coverage Configuration

Coverage is configured in `vitest.config.js`. Key settings:

### Included Files

- `app/**/*.{js,jsx}` - All app routes and pages
- `components/**/*.{js,jsx}` - All React components
- `libs/**/*.js` - Utility libraries
- `models/**/*.js` - Database models

### Excluded Files

- Test files (`**/*.test.{js,jsx}`, `**/*.spec.{js,jsx}`)
- Configuration files (`**/*.config.js`)
- Layout components (`app/**/layout.js`)
- Error boundaries (`app/**/error.js`)
- Loading components (`app/**/loading.js`)
- Mock files and test utilities

### Coverage Thresholds

Current thresholds (can be increased as coverage improves):

**Global Thresholds:**

- Statements: 10%
- Branches: 10%
- Functions: 8%
- Lines: 10%

**Critical Path Thresholds:**

- `libs/**/*.js`: 15% statements, 12% branches, 12% functions, 15% lines
- `models/**/*.js`: 15% statements, 12% branches, 12% functions, 15% lines

## Viewing Coverage Reports

### HTML Report (Recommended)

```bash
npm run coverage:report
npm run coverage:open
```

The HTML report provides:

- File-by-file coverage breakdown
- Line-by-line highlighting (green = covered, red = uncovered)
- Coverage percentages by file, directory, and overall
- Branch coverage visualization

### Terminal Summary

The terminal output shows:

- Overall coverage percentages
- Per-file coverage summary
- Threshold compliance status

## CI/CD Integration

### GitHub Actions Example

```yaml
- name: Run tests with coverage
  run: npm run test:coverage

- name: Upload coverage to Codecov
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/lcov.info
    flags: unittests
    name: codecov-umbrella
```

### Coveralls Example

```yaml
- name: Run tests with coverage
  run: npm run test:coverage

- name: Coveralls
  uses: coverallsapp/github-action@master
  with:
    file: ./coverage/lcov.info
```

## Improving Coverage

1. **Identify uncovered code**: Use the HTML report to find files with low coverage
2. **Focus on critical paths**: Prioritize testing business logic in `libs/` and `models/`
3. **Add tests incrementally**: Write tests for new features as you develop
4. **Increase thresholds gradually**: As coverage improves, raise thresholds in `vitest.config.js`

## Coverage Metrics Explained

- **Statements**: Percentage of code statements executed
- **Branches**: Percentage of conditional branches tested (if/else, switch cases)
- **Functions**: Percentage of functions called during tests
- **Lines**: Percentage of code lines executed

## Tips

- Use `npm run test:coverage:watch` during development to see coverage update in real-time
- Focus on testing critical business logic first (API routes, utilities, models)
- Don't aim for 100% coverage - focus on meaningful tests
- Use coverage reports to identify untested edge cases
- Consider excluding trivial files (like simple wrappers) from coverage

## Troubleshooting

### Coverage not updating

- Ensure `@vitest/coverage-v8` is installed: `npm install -D @vitest/coverage-v8`
- Clear coverage directory: `rm -rf coverage/`
- Run coverage again: `npm run test:coverage`

### Thresholds failing

- Review uncovered code in HTML report
- Add tests for missing coverage
- Temporarily lower thresholds if needed (but plan to increase them)

### Missing files in coverage

- Check `include` patterns in `vitest.config.js`
- Ensure files match the patterns (`.js` vs `.jsx`)
- Verify files aren't excluded in `exclude` patterns
