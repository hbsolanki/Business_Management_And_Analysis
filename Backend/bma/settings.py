"""
Main Django settings entry point.

This file imports all settings from the modular config package.
- All environment variables are loaded in: bma/config/variable.py
- All base Django settings are defined in: bma/config/base.py
- Local development overrides are in:    bma/config/local.py
- Production overrides are in:           bma/config/production.py

To switch environment, set DJANGO_SETTINGS_MODULE:
  - Development: bma.config.local
  - Production:  bma.config.production
  - Default (this file): bma.settings  →  auto-selects based on DEBUG
"""

from bma.config.variable import *  # noqa: F401, F403 — env vars (SECRET_KEY, DEBUG, DB_*, etc.)
from bma.config.base import *      # noqa: F401, F403 — all Django settings
from bma.config.local import *     # noqa: F401, F403 — local dev overrides (DEBUG=True, CORS, etc.)
