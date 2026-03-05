import sys
import os

try:
    from PIL import ImageGrab
except ImportError:
    print("You need to install Pillow: pip install Pillow")
    sys.exit(1)

out = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser("~/clipboard.png")
im = None

try:
    im = ImageGrab.grabclipboard()
except Exception as e:
    print("Clipboard access not supported on this platform.", e)
    sys.exit(1)

if im is not None:
    im.save(out, "PNG")
    print(out)
else:
    print("NO_IMAGE")
    sys.exit(2)
