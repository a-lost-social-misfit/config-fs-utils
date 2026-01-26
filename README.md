# config-fs-utils

File system utilities for configuration file management

[![npm version](https://badge.fury.io/js/config-fs-utils.svg)](https://www.npmjs.com/package/config-fs-utils)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- ✅ **Zero dependencies** - Uses only Node.js built-in modules
- ✅ **Simple & Flexible** - Two API styles for different use cases
- ✅ **Safe file operations** - Automatic backups and permission management
- ✅ **Tilde expansion** - Automatically expands `~` to home directory
- ✅ **Recursive directory creation** - Creates nested directories automatically
- ✅ **Perfect for config files** - Designed for configuration management

## Installation

```bash
npm install config-fs-utils
```

## Quick Start

### Simple API (Recommended for most users)

```javascript
const { setupStandardMuttDirs, writeConfigFiles } = require('config-fs-utils');

// Create standard directory structure
const dirs = await setupStandardMuttDirs();
// Creates: ~/.config/mutt/, ~/.local/etc/oauth-tokens/, ~/.cache/mutt/, etc.

// Write config files with automatic backups and secure permissions
await writeConfigFiles({
  '~/.config/myapp/config.ini': 'config content',
  '~/.config/myapp/settings.json': JSON.stringify({ key: 'value' })
});
// Files are created with 0o600 permissions
// Existing files are backed up automatically
```

### Flexible API (For advanced use cases)

```javascript
const { ensureDirectories, writeFile } = require('config-fs-utils');

// Create custom directories
await ensureDirectories([
  '/custom/path/one',
  '/custom/path/two',
  '~/relative/path'
]);

// Write file with custom options
await writeFile('/path/to/file', 'content', {
  backup: false,
  permissions: 0o644
});
```

## API Reference

### Simple API

#### `setupStandardMuttDirs(options)`

Creates standard Mutt/Neomutt directory structure.

**Parameters:**
- `options.baseDir` (string, optional): Base directory (defaults to `~`)

**Returns:** Object with created directory paths

```javascript
const dirs = await setupStandardMuttDirs();
// {
//   config: '/Users/username/.config/mutt',
//   accounts: '/Users/username/.config/mutt/accounts',
//   tokens: '/Users/username/.local/etc/oauth-tokens',
//   cacheHeaders: '/Users/username/.cache/mutt/headers',
//   cacheBodies: '/Users/username/.cache/mutt/bodies'
// }
```

#### `writeConfigFiles(files, options)`

Writes multiple config files with secure defaults.

**Parameters:**
- `files` (Object): Map of filepath to content
- `options.backup` (boolean, default: `true`): Create backups of existing files
- `options.permissions` (number, default: `0o600`): File permissions

**Returns:** Array of result objects

```javascript
const results = await writeConfigFiles({
  '~/.config/app/config.yml': yamlContent,
  '~/.config/app/secrets.json': secretsContent
});
// Each result: { path, backup, created }
```

### Flexible API

#### `ensureDirectory(dir)`

Creates a single directory (and parents if needed).

```javascript
await ensureDirectory('~/my/nested/directory');
```

#### `ensureDirectories(dirs)`

Creates multiple directories.

```javascript
await ensureDirectories([
  '~/dir1',
  '~/dir2/nested',
  '/absolute/path'
]);
```

#### `writeFile(filepath, content, options)`

Writes a single file with options.

**Options:**
- `backup` (boolean): Create backup if file exists
- `permissions` (number): File permissions (e.g., `0o600`)

```javascript
const result = await writeFile('~/config.txt', 'content', {
  backup: true,
  permissions: 0o600
});
// { path: '/Users/username/config.txt', backup: '...backup-2026-01-26...', created: false }
```

#### `writeFiles(files, options)`

Writes multiple files.

```javascript
await writeFiles({
  '~/file1.txt': 'content1',
  '~/file2.txt': 'content2'
}, {
  backup: true,
  permissions: 0o644
});
```

#### `backupFile(filepath)`

Creates a backup of a file if it exists.

```javascript
const backupPath = await backupFile('~/important.txt');
// Returns: '~/important.txt.backup-2026-01-26T12-34-56-789Z' or null
```

### Utility Functions

#### `expandHome(filepath)`

Expands `~` to home directory.

```javascript
expandHome('~/Documents');
// Returns: '/Users/username/Documents'
```

#### `exists(filepath)`

Checks if a file or directory exists.

```javascript
const fileExists = await exists('~/config.txt');
// Returns: true or false
```

#### `getStats(filepath)`

Gets file/directory stats.

```javascript
const stats = await getStats('~/file.txt');
// Returns: fs.Stats object or null
```

#### `ensureDirectoriesFromPaths(paths)`

Creates directories from a paths object (like from `mutt-config-core`).

```javascript
const { getConfigPaths } = require('mutt-config-core');
const paths = getConfigPaths('user@gmail.com');

await ensureDirectoriesFromPaths(paths);
// Creates all necessary parent directories
```

### Constants

#### `STANDARD_MUTT_DIRS`

Array of standard Mutt directory paths:

```javascript
[
  '.config/mutt',
  '.config/mutt/accounts',
  '.local/etc/oauth-tokens',
  '.cache/mutt/headers',
  '.cache/mutt/bodies'
]
```

## Integration with mutt-config-core

Perfect companion for [`mutt-config-core`](https://www.npmjs.com/package/mutt-config-core):

```javascript
const { generateMuttConfigs, getConfigPaths } = require('mutt-config-core');
const { setupStandardMuttDirs, writeConfigFiles } = require('config-fs-utils');

// 1. Generate configurations
const configs = generateMuttConfigs({
  email: 'user@gmail.com',
  realName: 'John Doe',
  editor: 'nvim',
  locale: 'en'
});

// 2. Setup directories
const dirs = await setupStandardMuttDirs();

// 3. Write config files
const paths = getConfigPaths('user@gmail.com');
await writeConfigFiles({
  [`~/${paths.accountMuttrc}`]: configs.accountMuttrc,
  [`~/${paths.mainMuttrc}`]: configs.mainMuttrc
});

console.log('Setup complete!');
```

## Use Cases

### Configuration Management

```javascript
// Safely update config files with automatic backups
await writeConfigFiles({
  '~/.bashrc': bashrcContent,
  '~/.vimrc': vimrcContent,
  '~/.gitconfig': gitconfigContent
});
```

### Application Setup

```javascript
// Create app directory structure
await ensureDirectories([
  '~/.config/myapp',
  '~/.config/myapp/plugins',
  '~/.local/share/myapp',
  '~/.cache/myapp'
]);

// Write initial config
await writeFile('~/.config/myapp/config.json', JSON.stringify({
  version: '1.0.0',
  settings: {}
}, null, 2));
```

### Secure File Operations

```javascript
// Write sensitive files with restricted permissions
await writeFile('~/.ssh/id_rsa', privateKey, {
  permissions: 0o600  // Owner read/write only
});
```

## Error Handling

All async functions can throw errors. Always use try-catch:

```javascript
try {
  await writeConfigFiles({
    '/protected/path': 'content'
  });
} catch (error) {
  console.error('Failed to write config:', error.message);
}
```

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

## Testing

Fully tested with 29 test cases covering:
- Directory creation (nested, recursive)
- File operations (write, backup, permissions)
- Tilde expansion
- Path utilities
- Integration scenarios

## Related Projects

- [mutt-config-core](https://github.com/a-lost-social-misfit/mutt-config-core) - Configuration generator
- [create-neomutt-gmail](https://github.com/a-lost-social-misfit/create-neomutt-gmail) - CLI tool (coming soon)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT © a-lost-social-misfit

## Author

Created by [a-lost-social-misfit](https://github.com/a-lost-social-misfit)

Part of a suite of tools for managing Neomutt + Gmail + OAuth2.0 setup.
