# 🤝 Contributing Guide

Thank you for your interest in contributing to Smart Fashion Prompt Builder!

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Development Setup](#development-setup)
4. [Making Changes](#making-changes)
5. [Testing](#testing)
6. [Submitting Changes](#submitting-changes)
7. [Style Guide](#style-guide)
8. [Commit Messages](#commit-messages)

---

## Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inspiring community for all. Please read and adhere to our Code of Conduct:

- Be respectful and inclusive
- Welcome diverse perspectives
- Focus on what is best for the community
- Show empathy towards other community members

### Reporting Issues

If you experience or witness unacceptable behavior, please report it to support@fashionpromptbuilder.com

---

## Getting Started

### Prerequisites

- Node.js >= 14.0.0
- npm >= 6.0.0
- Git >= 2.25.0
- Docker (optional)

### Fork and Clone

```bash
# Fork the repository on GitHub

# Clone your fork
git clone https://github.com/YOUR_USERNAME/smart-fashion-prompt-builder.git
cd smart-fashion-prompt-builder

# Add upstream remote
git remote add upstream https://github.com/yourusername/smart-fashion-prompt-builder.git
```

---

## Development Setup

### Install Dependencies

```bash
# Install all dependencies
npm run install-all

# Or manually
npm install
cd client && npm install && cd ..
```

### Create Environment File

```bash
cp .env.example .env
```

### Start Development Servers

```bash
# Terminal 1 - Backend
npm run server

# Terminal 2 - Frontend
npm run client
```

### Run Tests

```bash
npm test
```

---

## Making Changes

### Create Feature Branch

```bash
# Update main branch
git fetch upstream
git checkout main
git merge upstream/main

# Create feature branch
git checkout -b feature/your-feature-name
```

### Branch Naming Convention

- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Test additions
- `chore/` - Maintenance tasks

### Make Your Changes

```bash
# Edit files
# Test your changes
npm test

# Lint code
npm run lint
npm run lint:fix
```

---

## Testing

### Run Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test promptTemplates.test.js
```

### Writing Tests

```javascript
describe('Feature Name', () => {
  test('should do something', () => {
    // Arrange
    const input = 'test';
    
    // Act
    const result = myFunction(input);
    
    // Assert
    expect(result).toBe('expected');
  });
});
```

### Test Coverage

Maintain at least 70% coverage:
- Statements: 70%+
- Branches: 70%+
- Functions: 70%+
- Lines: 70%+

---

## Submitting Changes

### Commit Your Changes

```bash
# Stage changes
git add .

# Commit with descriptive message
git commit -m "feat: add new feature description"

# Push to your fork
git push origin feature/your-feature-name
```

### Create Pull Request

1. Go to GitHub repository
2. Click "New Pull Request"
3. Select your branch
4. Fill in PR template
5. Submit PR

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added
- [ ] Integration tests added
- [ ] All tests passing

## Checklist
- [ ] Code follows style guide
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] No new warnings generated

## Related Issues
Closes #123
```

### Review Process

1. Automated tests run
2. Code review by maintainers
3. Address feedback
4. Approval and merge

---

## Style Guide

### JavaScript/React

```javascript
// Use const by default
const value = 'string';

// Use arrow functions
const myFunction = (param) => {
  return param * 2;
};

// Use template literals
const message = `Hello, ${name}!`;

// Use destructuring
const { name, age } = user;

// Use async/await
const data = await fetchData();

// Add JSDoc comments
/**
 * Fetch data from API
 * @param {string} endpoint - API endpoint
 * @returns {Promise<Object>} Response data
 */
const fetchData = async (endpoint) => {
  // Implementation
};
```

### CSS

```css
/* Use CSS variables */
color: var(--primary-color);

/* Use semantic class names */
.button-primary { }
.form-group { }

/* Use BEM naming */
.block__element--modifier { }

/* Group related properties */
.element {
  /* Display & Layout */
  display: flex;
  
  /* Sizing */
  width: 100%;
  
  /* Colors */
  color: var(--text-primary);
  background-color: var(--background-color);
  
  /* Typography */
  font-size: var(--font-size-base);
  font-weight: 500;
  
  /* Spacing */
  margin: 0;
  padding: var(--spacing-md);
  
  /* Transitions */
  transition: all var(--transition-base);
}
```

### File Structure

```
src/
├── components/
│   ├── PromptBuilder.js
│   └── PromptBuilder.css
├── hooks/
│   └── usePromptBuilder.js
├── utils/
│   ├── apiClient.js
│   └── promptTemplates.js
├── constants/
│   └── options.js
├── __tests__/
│   ├── promptTemplates.test.js
│   └── apiClient.test.js
├── App.js
├── App.css
└── index.js
```

---

## Commit Messages

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `style` - Code style
- `refactor` - Code refactoring
- `perf` - Performance improvement
- `test` - Test addition
- `chore` - Maintenance

### Examples

```
feat(api): add new endpoint for prompt enhancement

- Implement POST /api/enhance-prompt endpoint
- Add input validation
- Add error handling

Closes #123
```

```
fix(ui): correct button alignment in form

The submit button was misaligned on mobile devices.
Fixed by adjusting flex properties.

Fixes #456
```

```
docs: update API documentation

Added examples for all endpoints and error handling.
```

---

## Documentation

### Update README.md

If adding new features, update README.md with:
- Feature description
- Usage examples
- Configuration options

### Update API.md

If adding API endpoints, update API.md with:
- Endpoint description
- Request/response examples
- Error codes
- Rate limits

### Add Comments

```javascript
// Good - explains why
// We use setTimeout to allow DOM to update before measuring
setTimeout(() => {
  measureElement();
}, 0);

// Bad - explains what (obvious from code)
// Set timeout to 0
setTimeout(() => {
  measureElement();
}, 0);
```

---

## Performance

### Guidelines

- Minimize bundle size
- Use lazy loading for components
- Optimize images
- Use caching where appropriate
- Avoid unnecessary re-renders

### Tools

```bash
# Analyze bundle size
npm run build
npm run analyze

# Performance profiling
npm run profile

# Lighthouse audit
npm run audit
```

---

## Security

### Guidelines

- Never commit secrets
- Validate all inputs
- Use HTTPS in production
- Keep dependencies updated
- Report security issues privately

### Dependency Updates

```bash
# Check for vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix

# Update dependencies
npm update
```

---

## Getting Help

- **Issues:** https://github.com/yourusername/smart-fashion-prompt-builder/issues
- **Discussions:** https://github.com/yourusername/smart-fashion-prompt-builder/discussions
- **Email:** support@fashionpromptbuilder.com
- **Discord:** https://discord.gg/your-invite

---

## Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes
- Project website

---

Thank you for contributing! 🎉

**Last Updated:** 2024
