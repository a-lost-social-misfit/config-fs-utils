/**
 * config-fs-utils
 * File system utilities for configuration file management
 *
 * No external dependencies. Uses Node.js built-in modules only.
 */

const fs = require("fs").promises;
const path = require("path");
const os = require("os");

/**
 * Standard Mutt directory structure
 */
const STANDARD_MUTT_DIRS = [
  ".config/mutt",
  ".config/mutt/accounts",
  ".local/etc/oauth-tokens",
  ".cache/mutt/headers",
  ".cache/mutt/bodies",
];

/**
 * Expand tilde (~) to home directory
 * @param {string} filepath - Path that may contain ~
 * @returns {string} Expanded absolute path
 */
function expandHome(filepath) {
  if (filepath.startsWith("~/") || filepath === "~") {
    return path.join(os.homedir(), filepath.slice(2));
  }
  return filepath;
}

/**
 * Ensure a single directory exists
 * @param {string} dir - Directory path
 * @returns {Promise<string>} Created directory path
 */
async function ensureDirectory(dir) {
  const expandedDir = expandHome(dir);
  await fs.mkdir(expandedDir, { recursive: true });
  return expandedDir;
}

/**
 * Ensure multiple directories exist
 * @param {string[]} dirs - Array of directory paths
 * @returns {Promise<string[]>} Array of created directory paths
 */
async function ensureDirectories(dirs) {
  const results = [];
  for (const dir of dirs) {
    const created = await ensureDirectory(dir);
    results.push(created);
  }
  return results;
}

/**
 * Setup standard Mutt directory structure
 * @param {Object} options - Options
 * @param {string} [options.baseDir='~'] - Base directory (defaults to home)
 * @returns {Promise<Object>} Created directory paths
 */
async function setupStandardMuttDirs(options = {}) {
  const baseDir = options.baseDir || "~";
  const dirs = STANDARD_MUTT_DIRS.map((dir) => path.join(baseDir, dir));

  const created = await ensureDirectories(dirs);

  return {
    config: created[0],
    accounts: created[1],
    tokens: created[2],
    cacheHeaders: created[3],
    cacheBodies: created[4],
  };
}

/**
 * Create backup of a file if it exists
 * @param {string} filepath - File to backup
 * @returns {Promise<string|null>} Backup file path or null if file doesn't exist
 */
async function backupFile(filepath) {
  const expandedPath = expandHome(filepath);

  try {
    await fs.access(expandedPath);
    // File exists, create backup
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupPath = `${expandedPath}.backup-${timestamp}`;
    await fs.copyFile(expandedPath, backupPath);
    return backupPath;
  } catch (error) {
    // File doesn't exist, no backup needed
    return null;
  }
}

/**
 * Write a single file with options
 * @param {string} filepath - File path
 * @param {string} content - File content
 * @param {Object} options - Options
 * @param {boolean} [options.backup=false] - Create backup if file exists
 * @param {number} [options.permissions] - File permissions (e.g., 0o600)
 * @returns {Promise<Object>} Result object
 */
async function writeFile(filepath, content, options = {}) {
  const expandedPath = expandHome(filepath);
  const dir = path.dirname(expandedPath);

  // Ensure directory exists
  await ensureDirectory(dir);

  // Backup if requested
  let backupPath = null;
  if (options.backup) {
    backupPath = await backupFile(expandedPath);
  }

  // Write file
  await fs.writeFile(expandedPath, content, "utf8");

  // Set permissions if specified
  if (options.permissions !== undefined) {
    await fs.chmod(expandedPath, options.permissions);
  }

  return {
    path: expandedPath,
    backup: backupPath,
    created: backupPath === null,
  };
}

/**
 * Write multiple files at once
 * @param {Object} files - Map of filepath to content
 * @param {Object} options - Options
 * @param {boolean} [options.backup=false] - Create backups
 * @param {number} [options.permissions] - File permissions
 * @returns {Promise<Object[]>} Array of result objects
 */
async function writeFiles(files, options = {}) {
  const results = [];

  for (const [filepath, content] of Object.entries(files)) {
    const result = await writeFile(filepath, content, options);
    results.push(result);
  }

  return results;
}

/**
 * Write config files with standard permissions (0o600)
 * @param {Object} files - Map of filepath to content
 * @param {Object} options - Options
 * @param {boolean} [options.backup=true] - Create backups (default: true)
 * @returns {Promise<Object[]>} Array of result objects
 */
async function writeConfigFiles(files, options = {}) {
  const defaultOptions = {
    backup: true,
    permissions: 0o600,
    ...options,
  };

  return writeFiles(files, defaultOptions);
}

/**
 * Check if a file or directory exists
 * @param {string} filepath - Path to check
 * @returns {Promise<boolean>} True if exists
 */
async function exists(filepath) {
  const expandedPath = expandHome(filepath);
  try {
    await fs.access(expandedPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get file stats
 * @param {string} filepath - File path
 * @returns {Promise<Object|null>} Stats object or null if doesn't exist
 */
async function getStats(filepath) {
  const expandedPath = expandHome(filepath);
  try {
    return await fs.stat(expandedPath);
  } catch {
    return null;
  }
}

/**
 * Create directories from mutt-config-core paths object
 * @param {Object} paths - Paths object from mutt-config-core
 * @returns {Promise<string[]>} Created directories
 */
async function ensureDirectoriesFromPaths(paths) {
  const dirs = new Set();

  // Keys that represent files (not directories)
  const fileKeys = ["accountmuttrc", "mainmuttrc"];

  for (const [key, filepath] of Object.entries(paths)) {
    const expandedPath = expandHome(filepath);
    const normalizedKey = key.toLowerCase();

    // Check if this is a file path or directory path
    if (fileKeys.includes(normalizedKey)) {
      // It's a file, create its parent directory
      const dir = path.dirname(expandedPath);
      dirs.add(dir);
    } else {
      // It's a directory path, create it directly
      dirs.add(expandedPath);
    }
  }

  return ensureDirectories(Array.from(dirs));
}

// Export API
module.exports = {
  // Simple API (most users)
  setupStandardMuttDirs,
  writeConfigFiles,

  // Flexible API (advanced users)
  ensureDirectory,
  ensureDirectories,
  writeFile,
  writeFiles,
  backupFile,

  // Utility functions
  expandHome,
  exists,
  getStats,
  ensureDirectoriesFromPaths,

  // Constants
  STANDARD_MUTT_DIRS,
};

// For testing
module.exports._internal = {
  expandHome,
};
