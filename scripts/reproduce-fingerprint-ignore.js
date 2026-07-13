const fs = require("node:fs/promises");
const path = require("node:path");
const Fingerprint = require("expo/fingerprint");

const projectRoot = path.resolve(__dirname, "..");
const cacheDirectory = path.join(
  projectRoot,
  "node_modules/react-native-reanimated/.rnrepo-cache/Debug",
);
const artifactPath = path.join(cacheDirectory, "fingerprint-repro.txt");

async function createIosFingerprint() {
  return Fingerprint.createFingerprintAsync(projectRoot, {
    platforms: ["ios"],
    debug: true,
    silent: true,
  });
}

async function main() {
  let originalArtifact;

  try {
    originalArtifact = await fs.readFile(artifactPath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }

  await fs.mkdir(cacheDirectory, { recursive: true });

  try {
    await fs.writeFile(artifactPath, "artifact-version-a\n");
    const before = await createIosFingerprint();

    await fs.writeFile(artifactPath, "artifact-version-b\n");
    const after = await createIosFingerprint();

    console.log(`Before: ${before.hash}`);
    console.log(`After:  ${after.hash}`);
    console.log(`Equal:  ${before.hash === after.hash}`);

    if (before.hash === after.hash) {
      throw new Error("The RNRepo artifact did not affect the fingerprint.");
    }

    console.log(
      "\nReproduced: a file inside the documented ignored directory changed the fingerprint.",
    );
  } finally {
    if (originalArtifact) {
      await fs.writeFile(artifactPath, originalArtifact);
    } else {
      await fs.rm(artifactPath, { force: true });
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
