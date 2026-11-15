"""Compatibility entry point for the canonical individual-plant exporter.

The four transparent single-plant PNG originals are persistent source assets.
Node/sharp exports independent WebP textures, fixed anchors and planting metadata.
C01 remains the previously approved full-field artwork exception.
"""

from pathlib import Path
import subprocess
import sys


ROOT = Path(__file__).resolve().parents[1]


def main():
    result = subprocess.run(
        ["node", str(ROOT / "scripts/export-crop-animation.mjs"), *sys.argv[1:]],
        cwd=ROOT,
        check=False,
    )
    return result.returncode


if __name__ == "__main__":
    raise SystemExit(main())