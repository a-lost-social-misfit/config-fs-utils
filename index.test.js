/**
 * Tests for config-fs-utils
 *
 * Run with: npm test
 */

const fs = require("fs").promises;
const path = require("path");
const os = require("os");
const {
  setupStandardMuttDirs,
  writeConfigFiles,
  ensureDirectory,
  ensureDirectories,
  writeFile,
  writeFiles,
  backupFile,
  expandHome,
  exists,
  getStats,
  ensureDirectoriesFromPaths,
  STANDARD_MUTT_DIRS,
  _internal,
} = require("./index");

// Test utilities
const TEST_DIR = path.join(os.tmpdir(), "config-fs-utils-test");

beforeEach(async () => {
  // Clean up test directory before each test
  try {
    await fs.rm(TEST_DIR, { recursive: true, force: true });
  } catch (error) {
    // Directory might not exist, ignore
  }
  await fs.mkdir(TEST_DIR, { recursive: true });
});

afterAll(async () => {
  // Clean up after all tests
  try {
    await fs.rm(TEST_DIR, { recursive: true, force: true });
  } catch (error) {
    // Ignore cleanup errors
  }
});

describe("config-fs-utils", () => {
  describe("expandHome", () => {
    test("expands ~ to home directory", () => {
      const result = expandHome("~/test/path");
      expect(result).toBe(path.join(os.homedir(), "test/path"));
    });

    test("expands ~ alone", () => {
      const result = expandHome("~");
      expect(result).toBe(os.homedir());
    });

    test("does not modify absolute paths", () => {
      const result = expandHome("/absolute/path");
      expect(result).toBe("/absolute/path");
    });

    test("does not modify relative paths", () => {
      const result = expandHome("relative/path");
      expect(result).toBe("relative/path");
    });
  });

  describe("ensureDirectory", () => {
    test("creates a single directory", async () => {
      const testPath = path.join(TEST_DIR, "test-dir");
      await ensureDirectory(testPath);

      const stat = await fs.stat(testPath);
      expect(stat.isDirectory()).toBe(true);
    });

    test("creates nested directories", async () => {
      const testPath = path.join(TEST_DIR, "nested/deep/directory");
      await ensureDirectory(testPath);

      const stat = await fs.stat(testPath);
      expect(stat.isDirectory()).toBe(true);
    });

    test("does not error if directory already exists", async () => {
      const testPath = path.join(TEST_DIR, "existing-dir");
      await fs.mkdir(testPath);

      await expect(ensureDirectory(testPath)).resolves.not.toThrow();
    });
  });

  describe("ensureDirectories", () => {
    test("creates multiple directories", async () => {
      const dirs = [
        path.join(TEST_DIR, "dir1"),
        path.join(TEST_DIR, "dir2"),
        path.join(TEST_DIR, "dir3"),
      ];

      const created = await ensureDirectories(dirs);
      expect(created).toHaveLength(3);

      for (const dir of dirs) {
        const stat = await fs.stat(dir);
        expect(stat.isDirectory()).toBe(true);
      }
    });

    test("returns created directory paths", async () => {
      const dirs = [path.join(TEST_DIR, "test1"), path.join(TEST_DIR, "test2")];

      const created = await ensureDirectories(dirs);
      expect(created).toEqual(dirs);
    });
  });

  describe("setupStandardMuttDirs", () => {
    test("creates standard Mutt directory structure", async () => {
      const result = await setupStandardMuttDirs({ baseDir: TEST_DIR });

      expect(result).toHaveProperty("config");
      expect(result).toHaveProperty("accounts");
      expect(result).toHaveProperty("tokens");
      expect(result).toHaveProperty("cacheHeaders");
      expect(result).toHaveProperty("cacheBodies");

      // Verify directories exist
      for (const dir of Object.values(result)) {
        const stat = await fs.stat(dir);
        expect(stat.isDirectory()).toBe(true);
      }
    });

    test("creates directories in home by default", async () => {
      // We can't test actual home directory creation, but we can test the structure
      const result = await setupStandardMuttDirs({ baseDir: TEST_DIR });

      expect(result.config).toContain(".config/mutt");
      expect(result.accounts).toContain(".config/mutt/accounts");
      expect(result.tokens).toContain(".local/etc/oauth-tokens");
    });
  });

  describe("backupFile", () => {
    test("creates backup if file exists", async () => {
      const testFile = path.join(TEST_DIR, "test.txt");
      await fs.writeFile(testFile, "original content");

      const backupPath = await backupFile(testFile);

      expect(backupPath).not.toBeNull();
      expect(backupPath).toContain(".backup-");

      const backupContent = await fs.readFile(backupPath, "utf8");
      expect(backupContent).toBe("original content");
    });

    test("returns null if file does not exist", async () => {
      const testFile = path.join(TEST_DIR, "nonexistent.txt");
      const backupPath = await backupFile(testFile);

      expect(backupPath).toBeNull();
    });
  });

  describe("writeFile", () => {
    test("writes file with content", async () => {
      const testFile = path.join(TEST_DIR, "test.txt");
      await writeFile(testFile, "test content");

      const content = await fs.readFile(testFile, "utf8");
      expect(content).toBe("test content");
    });

    test("creates parent directories", async () => {
      const testFile = path.join(TEST_DIR, "nested/deep/test.txt");
      await writeFile(testFile, "test content");

      const content = await fs.readFile(testFile, "utf8");
      expect(content).toBe("test content");
    });

    test("creates backup when option is true", async () => {
      const testFile = path.join(TEST_DIR, "test.txt");
      await fs.writeFile(testFile, "original");

      const result = await writeFile(testFile, "new content", { backup: true });

      expect(result.backup).not.toBeNull();
      expect(result.created).toBe(false);

      const backupContent = await fs.readFile(result.backup, "utf8");
      expect(backupContent).toBe("original");
    });

    test("sets file permissions", async () => {
      const testFile = path.join(TEST_DIR, "test.txt");
      await writeFile(testFile, "content", { permissions: 0o600 });

      const stat = await fs.stat(testFile);
      expect(stat.mode & 0o777).toBe(0o600);
    });

    test("returns result object", async () => {
      const testFile = path.join(TEST_DIR, "test.txt");
      const result = await writeFile(testFile, "content");

      expect(result).toHaveProperty("path");
      expect(result).toHaveProperty("backup");
      expect(result).toHaveProperty("created");
      expect(result.created).toBe(true);
    });
  });

  describe("writeFiles", () => {
    test("writes multiple files", async () => {
      const files = {
        [path.join(TEST_DIR, "file1.txt")]: "content1",
        [path.join(TEST_DIR, "file2.txt")]: "content2",
        [path.join(TEST_DIR, "file3.txt")]: "content3",
      };

      await writeFiles(files);

      for (const [filepath, expectedContent] of Object.entries(files)) {
        const content = await fs.readFile(filepath, "utf8");
        expect(content).toBe(expectedContent);
      }
    });

    test("returns array of results", async () => {
      const files = {
        [path.join(TEST_DIR, "file1.txt")]: "content1",
        [path.join(TEST_DIR, "file2.txt")]: "content2",
      };

      const results = await writeFiles(files);

      expect(results).toHaveLength(2);
      expect(results[0]).toHaveProperty("path");
      expect(results[1]).toHaveProperty("path");
    });
  });

  describe("writeConfigFiles", () => {
    test("writes files with 0o600 permissions by default", async () => {
      const files = {
        [path.join(TEST_DIR, "config.txt")]: "config content",
      };

      await writeConfigFiles(files);

      const stat = await fs.stat(path.join(TEST_DIR, "config.txt"));
      expect(stat.mode & 0o777).toBe(0o600);
    });

    test("creates backups by default", async () => {
      const testFile = path.join(TEST_DIR, "config.txt");
      await fs.writeFile(testFile, "original");

      const results = await writeConfigFiles({
        [testFile]: "new content",
      });

      expect(results[0].backup).not.toBeNull();
    });
  });

  describe("exists", () => {
    test("returns true for existing file", async () => {
      const testFile = path.join(TEST_DIR, "exists.txt");
      await fs.writeFile(testFile, "content");

      const result = await exists(testFile);
      expect(result).toBe(true);
    });

    test("returns false for non-existing file", async () => {
      const testFile = path.join(TEST_DIR, "nonexistent.txt");
      const result = await exists(testFile);
      expect(result).toBe(false);
    });

    test("returns true for existing directory", async () => {
      const result = await exists(TEST_DIR);
      expect(result).toBe(true);
    });
  });

  describe("getStats", () => {
    test("returns stats for existing file", async () => {
      const testFile = path.join(TEST_DIR, "test.txt");
      await fs.writeFile(testFile, "content");

      const stats = await getStats(testFile);
      expect(stats).not.toBeNull();
      expect(stats.isFile()).toBe(true);
    });

    test("returns null for non-existing file", async () => {
      const testFile = path.join(TEST_DIR, "nonexistent.txt");
      const stats = await getStats(testFile);
      expect(stats).toBeNull();
    });
  });

  describe("ensureDirectoriesFromPaths", () => {
    test("creates directories from paths object", async () => {
      const paths = {
        accountMuttrc: path.join(
          TEST_DIR,
          ".config/mutt/accounts/test@gmail.com.muttrc"
        ),
        mainMuttrc: path.join(TEST_DIR, ".config/mutt/muttrc"),
        oauthTokens: path.join(TEST_DIR, ".local/etc/oauth-tokens"),
        cacheHeaders: path.join(TEST_DIR, ".cache/mutt/headers"),
        cacheBodies: path.join(TEST_DIR, ".cache/mutt/bodies"),
      };

      await ensureDirectoriesFromPaths(paths);

      // Check that parent directories were created for files
      const accountsDir = await fs.stat(
        path.join(TEST_DIR, ".config/mutt/accounts")
      );
      expect(accountsDir.isDirectory()).toBe(true);

      const configDir = await fs.stat(path.join(TEST_DIR, ".config/mutt"));
      expect(configDir.isDirectory()).toBe(true);

      // Check that directory paths were created directly
      const tokensDir = await fs.stat(
        path.join(TEST_DIR, ".local/etc/oauth-tokens")
      );
      expect(tokensDir.isDirectory()).toBe(true);

      const headersDir = await fs.stat(
        path.join(TEST_DIR, ".cache/mutt/headers")
      );
      expect(headersDir.isDirectory()).toBe(true);
    });
  });

  describe("Integration tests", () => {
    test("complete workflow: setup dirs and write configs", async () => {
      // Setup standard directories
      const dirs = await setupStandardMuttDirs({ baseDir: TEST_DIR });

      // Write config files
      const files = {
        [path.join(dirs.config, "muttrc")]: "main config",
        [path.join(dirs.accounts, "test@gmail.com.muttrc")]: "account config",
      };

      const results = await writeConfigFiles(files);

      // Verify files exist with correct content
      const mainContent = await fs.readFile(
        path.join(dirs.config, "muttrc"),
        "utf8"
      );
      const accountContent = await fs.readFile(
        path.join(dirs.accounts, "test@gmail.com.muttrc"),
        "utf8"
      );

      expect(mainContent).toBe("main config");
      expect(accountContent).toBe("account config");
      expect(results).toHaveLength(2);
    });
  });
});
