from pathlib import Path
import os
from esc import settings

#Allows app to be configured to point to any folder in the file system, including network drives, but defaults to the application context dir
BASE_DIR = os.path.join(os.sep, os.environ.get("BASE_DIR", settings.BASE_DIR))

STORAGE = os.path.join(BASE_DIR, 'storage')

LOG_DIR = os.path.join(BASE_DIR, 'esc_app', 'log')
